import type { DeriveSceneSpec, ImageAsset, ImageOutputSpec } from "./types";

export interface DerivedGenerationInput {
  projectId: string;
  sceneId: string;
  assetId: string;
  entityIds: string[];
  visualGoal: string;
  referenceAssets: ImageAsset[];
  visualTransforms: string[];
  preservedFeatures: string[];
  forbiddenVariations: string[];
  continuityConstraints: string[];
  technicalConstraints?: string[];
  outputSpec: ImageOutputSpec;
  attempt: number;
}

export function assertApprovedReferences(referenceAssets: ImageAsset[]): void {
  if (referenceAssets.length === 0) {
    throw new Error("Derived asset generation requires at least one reference asset.");
  }

  const invalid = referenceAssets.filter((asset) => asset.status !== "approved");
  if (invalid.length > 0) {
    const summary = invalid
      .map((asset) => `${asset.assetId}:${asset.status}`)
      .join(", ");

    throw new Error(
      `All reference assets must be approved before derivation. Invalid references: ${summary}.`,
    );
  }
}

export function buildDerivedGenerationSpec(
  input: DerivedGenerationInput,
): DeriveSceneSpec {
  assertApprovedReferences(input.referenceAssets);

  const transformBlock =
    input.visualTransforms.length > 0
      ? input.visualTransforms.map((value) => `- ${value}`).join("\n")
      : "- No structural transform; preserve the approved reference.";

  const preserveBlock = input.preservedFeatures
    .map((value) => `- ${value}`)
    .join("\n");

  const prompt = [
    "Create a derived scene image from the supplied approved reference asset(s).",
    "Do not redesign or independently regenerate the primary entity.",
    "",
    "Scene objective:",
    input.visualGoal,
    "",
    "Apply only these visual transforms:",
    transformBlock,
    "",
    "Preserve these identity features exactly:",
    preserveBlock,
    "",
    "Treat all unmentioned visual details as inherited from the approved reference.",
    "Keep camera geometry and physical proportions plausible unless a specified transform requires a controlled change.",
  ].join("\n");

  return {
    projectId: input.projectId,
    sceneId: input.sceneId,
    outputAssetId: input.assetId,
    entityIds: input.entityIds,
    referenceAssetIds: input.referenceAssets.map((asset) => asset.assetId),
    prompt,
    negativeConstraints: input.forbiddenVariations,
    continuityConstraints: [
      ...input.preservedFeatures.map((value) => `Preserve: ${value}`),
      ...input.continuityConstraints,
    ],
    technicalConstraints: input.technicalConstraints ?? [],
    outputSpec: input.outputSpec,
    attempt: input.attempt,
  };
}
