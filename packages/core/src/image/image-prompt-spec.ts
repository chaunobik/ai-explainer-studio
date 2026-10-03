export interface ImagePromptSpec {
  promptId: string;
  assetId: string;
  sceneId: string;
  operation: "generate_anchor" | "derive_scene";
  referenceAssetIds: string[];
  subjectLock: {
    entityIds: string[];
    canonicalDescription: string;
    mustPreserve: string[];
    mustNotChange: string[];
  };
  sceneIntent: {
    narration: string;
    visualGoal: string;
    viewerShouldUnderstand: string[];
  };
  camera: {
    view: string;
    angle: string;
    distance: string;
    height: string;
    framing: string;
    perspective: string;
    lensStyle?: string;
  };
  composition: {
    subjectPosition: string;
    cropRules: string[];
    backgroundVisibility: string;
    negativeSpace: string;
    layering?: string[];
  };
  environment: {
    location: string;
    fixedElements: string[];
    allowedChanges: string[];
    forbiddenChanges: string[];
  };
  lighting: {
    style: string;
    direction: string;
    intensity: string;
    colorTemperature?: string;
    consistencyRules: string[];
  };
  appearance: {
    materials: string[];
    surfaceFinish: string[];
    realismNotes: string[];
  };
  requiredVisualElements: Array<{
    element: string;
    placement: string;
    state: string;
    purpose: string;
  }>;
  technicalOverlay?: {
    overlayType: string;
    elements: string[];
    directions: string[];
    labels: string[];
    mustNotImply: string[];
  };
  allowedTransforms: string[];
  technicalConstraints: string[];
  continuityConstraints: string[];
  negativeConstraints: string[];
  outputSpec: {
    aspectRatio: "9:16" | "16:9" | "1:1";
    width: number;
    height: number;
    transparentBackground?: boolean;
  };
}

const bullets = (items: string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";

export function compileImagePrompt(spec: ImagePromptSpec): string {
  const elements = spec.requiredVisualElements
    .map(
      (item, index) =>
        `${index + 1}. ${item.element}\n   Placement: ${item.placement}\n   State: ${item.state}\n   Purpose: ${item.purpose}`,
    )
    .join("\n");

  const overlay = spec.technicalOverlay
    ? [
        "TECHNICAL OVERLAY",
        `Type: ${spec.technicalOverlay.overlayType}`,
        "Elements:",
        bullets(spec.technicalOverlay.elements),
        "Directions:",
        bullets(spec.technicalOverlay.directions),
        "Labels:",
        bullets(spec.technicalOverlay.labels),
        "Must not imply:",
        bullets(spec.technicalOverlay.mustNotImply),
      ].join("\n")
    : "TECHNICAL OVERLAY\n- none";

  return [
    `IMAGE TASK: ${spec.operation === "generate_anchor" ? "CREATE CANONICAL ANCHOR" : "EDIT/DERIVE FROM APPROVED REFERENCE"}`,
    `Asset: ${spec.assetId} | Scene: ${spec.sceneId}`,
    `Reference assets: ${spec.referenceAssetIds.join(", ") || "none"}`,
    "",
    "SUBJECT IDENTITY LOCK",
    spec.subjectLock.canonicalDescription,
    "Must preserve:",
    bullets(spec.subjectLock.mustPreserve),
    "Must never change:",
    bullets(spec.subjectLock.mustNotChange),
    "",
    "SCENE INTENT",
    `Narration: ${spec.sceneIntent.narration}`,
    `Visual goal: ${spec.sceneIntent.visualGoal}`,
    "Viewer should understand:",
    bullets(spec.sceneIntent.viewerShouldUnderstand),
    "",
    "CAMERA",
    `View: ${spec.camera.view}`,
    `Angle: ${spec.camera.angle}`,
    `Distance: ${spec.camera.distance}`,
    `Height: ${spec.camera.height}`,
    `Framing: ${spec.camera.framing}`,
    `Perspective: ${spec.camera.perspective}`,
    spec.camera.lensStyle ? `Lens style: ${spec.camera.lensStyle}` : "",
    "",
    "COMPOSITION",
    `Subject position: ${spec.composition.subjectPosition}`,
    `Background visibility: ${spec.composition.backgroundVisibility}`,
    `Negative space: ${spec.composition.negativeSpace}`,
    "Crop rules:",
    bullets(spec.composition.cropRules),
    "Layering:",
    bullets(spec.composition.layering ?? []),
    "",
    "ENVIRONMENT",
    `Location: ${spec.environment.location}`,
    "Fixed elements:",
    bullets(spec.environment.fixedElements),
    "Allowed changes:",
    bullets(spec.environment.allowedChanges),
    "Forbidden changes:",
    bullets(spec.environment.forbiddenChanges),
    "",
    "LIGHTING",
    `Style: ${spec.lighting.style}`,
    `Direction: ${spec.lighting.direction}`,
    `Intensity: ${spec.lighting.intensity}`,
    spec.lighting.colorTemperature
      ? `Color temperature: ${spec.lighting.colorTemperature}`
      : "",
    "Consistency rules:",
    bullets(spec.lighting.consistencyRules),
    "",
    "MATERIALS AND REALISM",
    "Materials:",
    bullets(spec.appearance.materials),
    "Surface finish:",
    bullets(spec.appearance.surfaceFinish),
    "Reality notes:",
    bullets(spec.appearance.realismNotes),
    "",
    "REQUIRED VISUAL ELEMENTS",
    elements,
    "",
    overlay,
    "",
    "ALLOWED TRANSFORMS",
    bullets(spec.allowedTransforms),
    "",
    "TECHNICAL CONSTRAINTS",
    bullets(spec.technicalConstraints),
    "",
    "CONTINUITY CONSTRAINTS",
    bullets(spec.continuityConstraints),
    "",
    "NEGATIVE CONSTRAINTS",
    bullets(spec.negativeConstraints),
    "",
    "OUTPUT",
    `${spec.outputSpec.width}x${spec.outputSpec.height}, aspect ratio ${spec.outputSpec.aspectRatio}`,
    spec.outputSpec.transparentBackground ? "Transparent background required." : "Opaque background.",
    "",
    "FINAL RULE",
    spec.operation === "derive_scene"
      ? "Do not create a new version of the primary subject. Treat the supplied reference asset as the authoritative identity and edit only what is explicitly requested above."
      : "This image becomes the authoritative identity reference for all later scenes. Favor stable, reproducible geometry over decorative variation.",
  ]
    .filter(Boolean)
    .join("\n");
}
