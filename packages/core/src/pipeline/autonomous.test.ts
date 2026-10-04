import {describe, expect, it} from "vitest";
import {
  approveAutonomousCheckpoint,
  beginAutonomousStage,
  createAutonomousRunState,
  getAutonomousDirective,
  recordAutonomousStageResult,
  recoverAutonomousStage,
  reviseAutonomousCheckpoint,
} from "./autonomous";

function passCurrent(state: ReturnType<typeof createAutonomousRunState>) {
  return recordAutonomousStageResult(beginAutonomousStage(state), "pass");
}

describe("autonomous pipeline", () => {
  it("defaults to hands-off mode from a single topic", () => {
    const state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "How a refrigerator works",
      createdAt: "2026-10-03T00:00:00.000Z",
    });

    expect(state.runMode).toBe("hands_off");
    expect(state.currentStage).toBe("research");
    expect(state.stages.research.status).toBe("ready");
    expect(getAutonomousDirective(state).kind).toBe("run_stage");
  });

  it("creates scene IDs before voice and then finalizes timing from audio", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
    });

    state = passCurrent(state);
    expect(state.currentStage).toBe("script");

    state = passCurrent(state);
    expect(state.currentStage).toBe("storyboard");

    state = passCurrent(state);
    expect(state.currentStage).toBe("master_voice");
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

  it("auto-approves canonical checkpoint in hands-off mode", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
    });

    while (state.currentStage !== "scene_prompts") {
      state = passCurrent(state);
    }

    expect(state.stages.checkpoint_canonical.status).toBe("approved");
    expect(state.currentStage).toBe("scene_prompts");
  });

  it("recovers only the canonical branch after an exhausted A0 strategy", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
      maxAttempts: 1,
    });

    while (state.currentStage !== "canonical_generation") {
      state = passCurrent(state);
    }

    state = recordAutonomousStageResult(
      beginAutonomousStage(state),
      "fail",
      "Legacy 4x2 board failed semantic QA.",
    );
    expect(state.stages.canonical_generation.status).toBe("needs_human_review");

    state = recoverAutonomousStage(
      state,
      "canonical_prompt",
      "Switch to one canonical hero reference.",
    );

    expect(state.currentStage).toBe("canonical_prompt");
    expect(state.stages.canonical_prompt.status).toBe("ready");
    expect(state.stages.canonical_generation.attempt).toBe(0);
    expect(state.stages.research.status).toBe("passed");
    expect(state.stages.script.status).toBe("passed");
    expect(state.stages.master_voice.status).toBe("passed");
  });

  it("reopens a completed run from script when duration quality fails", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
    });

    while (state.currentStage !== "complete") {
      state = passCurrent(state);
    }

    state = recoverAutonomousStage(
      state,
      "script",
      "Final duration is too short.",
    );

    expect(state.currentStage).toBe("script");
    expect(state.stages.script.status).toBe("ready");
    expect(state.stages.storyboard.status).toBe("waiting");
    expect(state.stages.master_voice.status).toBe("waiting");
    expect(state.stages.final_render.status).toBe("waiting");
    expect(state.stages.research.status).toBe("passed");
  });

  it("preserves explicit checkpoints in guided mode", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
      runMode: "guided",
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

  it("revises only the affected branch at a guided checkpoint", () => {
    let state = createAutonomousRunState({
      runId: "RUN-1",
      projectId: "P-1",
      topic: "Topic",
      runMode: "guided",
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
