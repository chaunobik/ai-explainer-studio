import {describe, expect, it} from "vitest";
import {validateMotionSpec, type MotionSpec} from "./motion-spec";

describe("MotionSpec validator", () => {
  it("rejects operations outside the scene and zero-length heat paths", () => {
    const spec: MotionSpec = {
      motion_plan_id: "M1",
      project_id: "P1",
      fps: 30,
      width: 1080,
      height: 1920,
      scenes: [
        {
          scene_id: "S1",
          duration_sec: 5,
          source_asset_ids: ["A1"],
          operations: [
            {
              type: "heat_flow",
              start_sec: 1,
              end_sec: 6,
              direction: "forward",
              speed: 1,
              paths: [{x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5}],
            },
          ],
        },
      ],
    };

    const report = validateMotionSpec(spec, new Map([["S1", 5]]));
    const codes = report.errors.map((value) => value.code);
    expect(codes).toContain("MOTION_WINDOW_OUTSIDE_SCENE");
    expect(codes).toContain("MOTION_ZERO_PATH");
  });

  it("requires exact storyboard scene coverage", () => {
    const spec: MotionSpec = {
      motion_plan_id: "M1",
      project_id: "P1",
      fps: 30,
      width: 1080,
      height: 1920,
      scenes: [
        {
          scene_id: "S1",
          duration_sec: 5,
          source_asset_ids: ["A1"],
          operations: [],
        },
      ],
    };

    const report = validateMotionSpec(
      spec,
      new Map([
        ["S1", 5],
        ["S2", 5],
      ]),
    );

    expect(report.errors.map((value) => value.code)).toContain(
      "MOTION_SCENE_COVERAGE",
    );
  });
});
