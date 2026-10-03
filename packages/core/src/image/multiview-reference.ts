import type {GenerateReferencePackSpec} from "./types";

export interface PhotoCaptureSpec {
  captureProfileId: string;
  captureMode: "smartphone" | "camera";
  deviceClass: string;
  lensEquivalentMm: number;
  apertureF: number;
  shutterSpeed: string;
  iso: number;
  whiteBalanceKelvin: number;
  cameraHeightM: number;
  subjectDistanceM: number;
  focus: string;
  exposure: string;
  lighting: string;
  stabilization?: string;
  processing: string;
  realismRules: string[];
}

export interface MultiViewReferencePromptSpec {
  projectId: string;
  promptId: string;
  assetId: string;
  operation: "generate_reference_pack";
  captureProfile: PhotoCaptureSpec;
  subjectLock: {
    entityIds: string[];
    canonicalDescription: string;
    mustPreserve: string[];
    mustNotChange: string[];
  };
  requiredViews: Array<{
    viewId: string;
    label: string;
    yawDegrees: number;
    pitchDegrees: number;
    framing: string;
    purpose: string;
  }>;
  environment: {
    location: string;
    background: string;
    floor: string;
    lightingContinuity: string;
  };
  boardComposition: {
    layout: string;
    panelRules: string[];
    labels: string;
    cropRules: string[];
  };
  crossViewConsistencyRules: string[];
  realismRules: string[];
  technicalConstraints: string[];
  negativeConstraints: string[];
  outputSpec: {
    aspectRatio: "16:9" | "4:3" | "1:1";
    width: number;
    height: number;
    transparentBackground?: boolean;
  };
}

const bullets = (items: string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";

export function compileMultiViewReferencePrompt(
  spec: MultiViewReferencePromptSpec,
): string {
  const c = spec.captureProfile;
  const views = spec.requiredViews
    .map(
      (view, index) =>
        `${index + 1}. ${view.label} [${view.viewId}]\n   yaw: ${view.yawDegrees}°\n   pitch: ${view.pitchDegrees}°\n   framing: ${view.framing}\n   purpose: ${view.purpose}`,
    )
    .join("\n");

  return [
    "IMAGE TASK: CREATE ONE CANONICAL MULTI-VIEW REFERENCE BOARD",
    `Asset: ${spec.assetId}`,
    `Prompt: ${spec.promptId}`,
    "",
    "CORE REQUIREMENT",
    "Every panel must depict the exact same physical product. This board is the visual source of truth for all later video scenes.",
    "",
    "SUBJECT IDENTITY LOCK",
    spec.subjectLock.canonicalDescription,
    "Must preserve in every panel:",
    bullets(spec.subjectLock.mustPreserve),
    "Must never change between panels:",
    bullets(spec.subjectLock.mustNotChange),
    "",
    "CAPTURE PROFILE",
    `Capture mode: ${c.captureMode}`,
    `Device class: ${c.deviceClass}`,
    `Lens: ${c.lensEquivalentMm} mm full-frame equivalent`,
    `Aperture: f/${c.apertureF}`,
    `Shutter: ${c.shutterSpeed}`,
    `ISO: ${c.iso}`,
    `White balance: ${c.whiteBalanceKelvin} K`,
    `Camera height: ${c.cameraHeightM} m`,
    `Subject distance: ${c.subjectDistanceM} m`,
    `Focus: ${c.focus}`,
    `Exposure: ${c.exposure}`,
    `Lighting: ${c.lighting}`,
    c.stabilization ? `Stabilization: ${c.stabilization}` : "",
    `Processing: ${c.processing}`,
    "Capture realism rules:",
    bullets(c.realismRules),
    "",
    "REQUIRED VIEWS",
    views,
    "",
    "ENVIRONMENT",
    `Location: ${spec.environment.location}`,
    `Background: ${spec.environment.background}`,
    `Floor: ${spec.environment.floor}`,
    `Lighting continuity: ${spec.environment.lightingContinuity}`,
    "",
    "REFERENCE BOARD COMPOSITION",
    `Layout: ${spec.boardComposition.layout}`,
    `Labels: ${spec.boardComposition.labels}`,
    "Panel rules:",
    bullets(spec.boardComposition.panelRules),
    "Crop rules:",
    bullets(spec.boardComposition.cropRules),
    "",
    "CROSS-VIEW CONSISTENCY",
    bullets(spec.crossViewConsistencyRules),
    "",
    "PHOTOGRAPHIC REALISM",
    bullets(spec.realismRules),
    "",
    "TECHNICAL SAFETY",
    bullets(spec.technicalConstraints),
    "",
    "NEGATIVE CONSTRAINTS",
    bullets(spec.negativeConstraints),
    "",
    "OUTPUT",
    `${spec.outputSpec.width}x${spec.outputSpec.height}, aspect ratio ${spec.outputSpec.aspectRatio}`,
    spec.outputSpec.transparentBackground
      ? "Transparent background."
      : "Opaque background.",
    "",
    "FINAL RULE",
    "Do not create several similar products. Create one stable canonical product observed from multiple camera positions. Geometry, materials, proportions and distinguishing features must remain identical across every panel.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function toGenerateReferencePackSpec(
  spec: MultiViewReferencePromptSpec,
  attempt = 0,
): GenerateReferencePackSpec {
  return {
    promptSpecId: spec.promptId,
    projectId: spec.projectId,
    outputAssetId: spec.assetId,
    entityIds: spec.subjectLock.entityIds,
    referenceAssetIds: [],
    prompt: compileMultiViewReferencePrompt(spec),
    negativeConstraints: spec.negativeConstraints,
    continuityConstraints: spec.crossViewConsistencyRules,
    technicalConstraints: spec.technicalConstraints,
    outputSpec: spec.outputSpec,
    attempt,
  };
}
