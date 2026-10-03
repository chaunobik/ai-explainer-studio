import { describe, expect, it } from "vitest";
import {
  beginStage,
  completeStage,
  createPipelineState,
  getOverallStatus,
  getReadyStages,
  retryStage,
} from "./state-machine";

describe("pipeline state machine", () => {
  it("unlocks dependent stages and allows voice to run in parallel after script", () => {
    let state = createPipelineState("P1");
    expect(getReadyStages(state)).toEqual(["research"]);

    state = beginStage(state, "research");
    state = completeStage(state, "research", "pass", ["R1"]);
    expect(getReadyStages(state)).toContain("script");

    state = beginStage(state, "script");
    state = completeStage(state, "script", "pass", ["SC1"]);

    const ready = getReadyStages(state);
    expect(ready).toContain("storyboard");
    expect(ready).toContain("voice");
  });

  it("moves a repeatedly failing stage to human review after max attempts", () => {
    let state = createPipelineState("P2", 3);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      state = beginStage(state, "research");
      state = completeStage(state, "research", "fail");
      expect(state.stages.research.status).toBe("failed");
      state = retryStage(state, "research");
    }

    state = beginStage(state, "research");
    state = completeStage(state, "research", "fail");

    expect(state.stages.research.status).toBe("needs_human_review");
    expect(getOverallStatus(state)).toBe("needs_human_review");
  });
});
