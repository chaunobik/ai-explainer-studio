import {describe, expect, it} from "vitest";
import {nextMotionBackend, routeMotion} from "./motion-router";

describe("motion router", () => {
  it("routes technical scenes to deterministic Remotion", () => {
    const route = routeMotion({
      intent: "technical_diagram",
      hasApprovedImage: true,
      wanAvailable: true,
      ltxAvailable: true,
    });

    expect(route.primary).toBe("remotion");
  });

  it("uses Wan I2V for realistic motion with an approved image", () => {
    const route = routeMotion({
      intent: "realistic_motion",
      hasApprovedImage: true,
      wanAvailable: true,
    });

    expect(route.primary).toBe("wan_i2v");
    expect(route.fallbacks).toEqual(["remotion", "static"]);
  });

  it("degrades from Wan to Remotion instead of blocking the video", () => {
    const route = routeMotion({
      intent: "realistic_motion",
      hasApprovedImage: true,
      wanAvailable: true,
    });

    expect(nextMotionBackend(route, ["wan_i2v"])).toBe("remotion");
    expect(nextMotionBackend(route, ["wan_i2v", "remotion"])).toBe("static");
  });

  it("does not route to generative video when disabled", () => {
    const route = routeMotion({
      intent: "realistic_motion",
      hasApprovedImage: true,
      wanAvailable: true,
      allowGenerativeVideo: false,
    });

    expect(route.primary).toBe("remotion");
  });
});
