export type MotionBackend =
  | "wan_i2v"
  | "ltx"
  | "remotion"
  | "static";

export type MotionIntent =
  | "realistic_motion"
  | "technical_diagram"
  | "programmatic_animation"
  | "static_explainer"
  | "advanced_generative";

export interface MotionRoutingInput {
  intent: MotionIntent;
  hasApprovedImage: boolean;
  wanAvailable?: boolean;
  ltxAvailable?: boolean;
  allowGenerativeVideo?: boolean;
}

export interface MotionRoute {
  primary: MotionBackend;
  fallbacks: MotionBackend[];
  reason: string;
}

export function routeMotion(input: MotionRoutingInput): MotionRoute {
  const wanAvailable = input.wanAvailable ?? true;
  const ltxAvailable = input.ltxAvailable ?? false;
  const allowGenerativeVideo = input.allowGenerativeVideo ?? true;

  if (
    input.intent === "technical_diagram" ||
    input.intent === "programmatic_animation"
  ) {
    return {
      primary: "remotion",
      fallbacks: input.hasApprovedImage ? ["static"] : [],
      reason:
        "Technical/programmatic scenes should remain deterministic and fact-preserving.",
    };
  }

  if (input.intent === "static_explainer") {
    return {
      primary: input.hasApprovedImage ? "static" : "remotion",
      fallbacks: input.hasApprovedImage ? ["remotion"] : [],
      reason: "The scene does not require generative motion.",
    };
  }

  if (
    input.intent === "advanced_generative" &&
    allowGenerativeVideo &&
    ltxAvailable
  ) {
    return {
      primary: "ltx",
      fallbacks: [
        ...(wanAvailable && input.hasApprovedImage ? (["wan_i2v"] as const) : []),
        "remotion",
        ...(input.hasApprovedImage ? (["static"] as const) : []),
      ],
      reason:
        "Advanced multi-keyframe/generative motion prefers LTX, then degrades safely.",
    };
  }

  if (
    input.intent === "realistic_motion" &&
    allowGenerativeVideo &&
    wanAvailable &&
    input.hasApprovedImage
  ) {
    return {
      primary: "wan_i2v",
      fallbacks: ["remotion", "static"],
      reason:
        "Realistic motion uses image-to-video to preserve canonical identity, with deterministic fallback.",
    };
  }

  return {
    primary: "remotion",
    fallbacks: input.hasApprovedImage ? ["static"] : [],
    reason:
      "No valid generative-video route is available; use deterministic Remotion motion.",
  };
}

export function nextMotionBackend(
  route: MotionRoute,
  failedBackends: MotionBackend[],
): MotionBackend | null {
  const candidates = [route.primary, ...route.fallbacks];
  return (
    candidates.find((candidate) => !failedBackends.includes(candidate)) ?? null
  );
}
