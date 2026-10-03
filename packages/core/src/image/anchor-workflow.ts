import type { GenerateAnchorSpec, ImageAsset, ImageOutputSpec } from "./types";

export interface AnchorStyleSpec {
  realismTarget: string;
  lighting: string;
  cameraStyle: string;
  environment: string;
  colorNotes?: string;
  forbiddenStyleTraits?: string[];
}

export interface AnchorGenerationInput {
  projectId: string;
  sceneId: string;
  assetId: string;
  entityIds: string[];
  canonicalDescription: string;
  invariantFeatures: string[];
  forbiddenVariations: string[];
  continuityConstraints: string[];
  style: AnchorStyleSpec;
  technicalConstraints?: string[];
  outputSpec: ImageOutputSpec;
  attempt: number;
}

export function buildAnchorGenerationSpec(
  input: AnchorGenerationInput,
): GenerateAnchorSpec {
  const invariantBlock = input.invariantFeatures
    .map((value) => `- ${value}`)
    .join("\n");

  const styleBlock = [
    `Realism target: ${input.style.realismTarget}`,
    `Lighting: ${input.style.lighting}`,
    `Camera style: ${input.style.cameraStyle}`,
    `Environment: ${input.style.environment}`,
    input.style.colorNotes ? `Color notes: ${input.style.colorNotes}` : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  const prompt = [
    "Create the canonical anchor image for an engineering explainer video.",
    "",
    "Primary subject:",
    input.canonicalDescription,
    "",
    "Identity features that must be visible and preserved in all later scenes:",
    invariantBlock,
    "",
    "Visual direction:",
    styleBlock,
    "",
    "Use natural, believable photography cues. Keep proportions physically plausible.",
    "Do not invent technical components that are not visible or specified.",
    "Avoid artificial showroom perfection, excessive cinematic glow, or stylized CGI unless explicitly requested.",
    "This image will be the master continuity reference for all later derived scenes.",
  ].join("\n");

  return {
    projectId: input.projectId,
    sceneId: input.sceneId,
    outputAssetId: input.assetId,
    entityIds: input.entityIds,
    prompt,
    negativeConstraints: [
      ...input.forbiddenVariations,
      ...(input.style.forbiddenStyleTraits ?? []),
    ],
    continuityConstraints: [
      ...input.invariantFeatures.map((value) => `Preserve: ${value}`),
      ...input.continuityConstraints,
    ],
    technicalConstraints: input.technicalConstraints ?? [],
    outputSpec: input.outputSpec,
    attempt: input.attempt,
  };
}

export function isApprovedAnchor(asset: ImageAsset): boolean {
  return asset.assetRole === "anchor" && asset.status === "approved";
}

export function assertApprovedAnchor(asset: ImageAsset): void {
  if (asset.assetRole !== "anchor") {
    throw new Error(`Asset ${asset.assetId} is not an anchor asset.`);
  }

  if (asset.status !== "approved") {
    throw new Error(
      `Anchor ${asset.assetId} must be approved before derived assets can be created. Current status: ${asset.status}.`,
    );
  }
}
