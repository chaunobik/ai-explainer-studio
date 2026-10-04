import {describe, expect, it} from "vitest";
import {
  beginAutonomousStage,
  createAutonomousRunState,
  getAutonomousDirective,
  recordAutonomousStageResult,
} from "./autonomous";

function passCurrent(state: ReturnType<typeof createAutonomousRunState>) {
  return recordAutonomousStageResult(beginAutonomousStage(state), "pass");
}

describe("autonomous pipeline", () => {
  it("starts from research with a single topic", () => {
    const state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "How a refrigerator works",
      createdAt: "2026-10-03T00:00:00.000Z",
    });

    expect(state.currentStage).toBe("research");
    expect(state.stages.research.status).toBe("ready");
    expect(getAutonomousDirective(state).kind).toBe("run_stage");
  });

  it("auto-repairs failures and escalates only after max attempts", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
      maxAttempts: 3,
    });

    state = recordAutonomousStageResult(
      beginAutonomousStage(state),
      "fail",
      "Schema mismatch",
    );
    expect(state.stages.research.status).toBe("auto_repair");
    expect(getAutonomousDirective(state).kind).toBe("repair_and_retry");

    state = recordAutonomousStageResult(beginAutonomousStage(state), "fail");
    expect(state.stages.research.status).toBe("auto_repair");

    state = recordAutonomousStageResult(beginAutonomousStage(state), "fail");
    expect(state.stages.research.status).toBe("needs_human_review");
    expect(getAutonomousDirective(state).kind).toBe("human_intervention");
  });

  it("skips canonical, storyboard and final checkpoints automatically", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
    });

    while (state.currentStage !== "canonical_qa") {
      state = passCurrent(state);
    }
    state = passCurrent(state);

    expect(state.currentStage).toBe("scene_prompts");
    expect(state.stages.checkpoint_canonical.status).toBe("approved");

    while (state.currentStage !== "storyboard_preview") {
      state = passCurrent(state);
    }
    state = passCurrent(state);

    expect(state.currentStage).toBe("scene_generation");
    expect(state.stages.checkpoint_storyboard.status).toBe("approved");

    while (state.currentStage !== "final_qa") {
      state = passCurrent(state);
    }
    state = passCurrent(state);

    expect(state.currentStage).toBe("complete");
    expect(state.stages.checkpoint_final.status).toBe("approved");
    expect(getAutonomousDirective(state).kind).toBe("complete");
  });
});
