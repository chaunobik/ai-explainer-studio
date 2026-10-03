import {describe, expect, it} from "vitest";
import {
  approveAutonomousCheckpoint,
  beginAutonomousStage,
  createAutonomousRunState,
  getAutonomousDirective,
  recordAutonomousStageResult,
  reviseAutonomousCheckpoint,
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

  it("pauses at canonical checkpoint and resumes after approval", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
    });

    while (state.currentStage !== "checkpoint_canonical") {
      state = passCurrent(state);
    }

    expect(getAutonomousDirective(state).kind).toBe("human_checkpoint");
    expect(state.stages.checkpoint_canonical.status).toBe("needs_human_review");

    state = approveAutonomousCheckpoint(state);
    expect(state.currentStage).toBe("scene_prompts");
    expect(state.stages.scene_prompts.status).toBe("ready");
  });

  it("revises only the affected branch at a checkpoint", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
    });

    while (state.currentStage !== "checkpoint_canonical") {
      state = passCurrent(state);
    }

    state = reviseAutonomousCheckpoint(
      state,
      "canonical_prompt",
      "Make the handle smaller.",
    );

    expect(state.currentStage).toBe("canonical_prompt");
    expect(state.stages.canonical_prompt.status).toBe("ready");
    expect(state.stages.research.status).toBe("passed");
    expect(state.revisionHistory).toHaveLength(1);
  });
});
