import {describe, expect, it} from "vitest";
import {buildSceneSubtitleCues} from "./subtitle";

describe("subtitle cue builder", () => {
  it("covers the complete audio duration without overlap", () => {
    const cues = buildSceneSubtitleCues(
      "S1",
      "Một hai ba bốn năm sáu bảy tám chín mười",
      5,
      4,
    );

    expect(cues[0].start_sec).toBe(0);
    expect(cues.at(-1)?.end_sec).toBe(5);

    for (let i = 1; i < cues.length; i += 1) {
      expect(cues[i].start_sec).toBe(cues[i - 1].end_sec);
    }
  });
});
