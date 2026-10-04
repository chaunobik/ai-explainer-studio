import {describe, expect, it} from "vitest";
import {buildMediaAttemptPlan, routeSceneMedia} from "./media-router";

describe("media router", () => {
  it("routes realistic motion to Wan with deterministic fallback", () => {
    const route = routeSceneMedia({
      scene_id: "S1",
      visual_type: "reference_edit",
      requires_natural_motion: true,
    });

    expect(route.primary).toBe("wan2.2");
    expect(route.fallbacks).toContain("static_motion");
  });

  it("keeps technical diagrams deterministic", () => {
    const route = routeSceneMedia({
      scene_id: "S2",
      visual_type: "technical_diagram",
    });

    expect(route.primary).toBe("remotion");
    expect(route.fallbacks).toEqual(["static_motion"]);
  });

  it("builds bounded retries followed by fallback providers", () => {
    const route = routeSceneMedia({
      scene_id: "S3",
      visual_type: "generated_image",
      requires_keyframe_interpolation: true,
    });
    const plan = buildMediaAttemptPlan(route, 2);

    expect(plan).toEqual([
      {provider: "ltx", attempt: 1},
      {provider: "ltx", attempt: 2},
      {provider: "wan2.2", attempt: 1},
      {provider: "wan2.2", attempt: 2},
      {provider: "static_motion", attempt: 1},
      {provider: "static_motion", attempt: 2},
    ]);
  });
});
