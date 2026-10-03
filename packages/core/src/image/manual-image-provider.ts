import type { ImageProvider } from "./image-provider";
import type {
  DeriveSceneSpec,
  GenerateAnchorSpec,
  GenerateReferencePackSpec,
  ImageProviderJob,
  ImageProviderResult,
} from "./types";

export class ManualImageProvider implements ImageProvider {
  readonly id = "manual-chatgpt-image";
  readonly mode = "manual" as const;

  async generateReferencePack(
    spec: GenerateReferencePackSpec,
  ): Promise<ImageProviderResult> {
    return {
      kind: "requires_user_action",
      job: this.buildJob("generate_reference_pack", spec, []),
    };
  }

  async generateAnchor(spec: GenerateAnchorSpec): Promise<ImageProviderResult> {
    return {
      kind: "requires_user_action",
      job: this.buildJob("generate_anchor", spec, spec.referenceAssetIds ?? []),
    };
  }

  async deriveScene(spec: DeriveSceneSpec): Promise<ImageProviderResult> {
    if (spec.referenceAssetIds.length === 0) {
      throw new Error("Derived scene generation requires at least one reference asset.");
    }

    return {
      kind: "requires_user_action",
      job: this.buildJob("derive_scene", spec, spec.referenceAssetIds),
    };
  }

  private buildJob(
    operation: "generate_reference_pack" | "generate_anchor" | "derive_scene",
    spec: GenerateReferencePackSpec | GenerateAnchorSpec | DeriveSceneSpec,
    referenceAssetIds: string[],
  ): ImageProviderJob {
    return {
      promptSpecId: spec.promptSpecId,
      jobId: [
        this.id,
        spec.projectId,
        spec.sceneId ?? "anchor",
        spec.outputAssetId,
        String(spec.attempt),
      ].join(":"),
      providerId: this.id,
      providerMode: this.mode,
      operation,
      projectId: spec.projectId,
      sceneId: spec.sceneId,
      outputAssetId: spec.outputAssetId,
      referenceAssetIds,
      prompt: spec.prompt,
      negativeConstraints: spec.negativeConstraints,
      continuityConstraints: spec.continuityConstraints,
      technicalConstraints: spec.technicalConstraints,
      outputSpec: spec.outputSpec,
      status: "requires_user_action",
      attempt: spec.attempt,
      userInstructions:
        operation === "generate_reference_pack"
          ? "Use this exact prompt in ChatGPT Image to create one multi-view reference board, then import the result for Multi-View QA."
          : operation === "generate_anchor"
            ? "Use this prompt package in ChatGPT Image with the approved reference-pack view(s), then import the result into the project."
            : "Upload the approved reference asset(s) to ChatGPT Image, apply this edit prompt, then import the derived result.",
    };
  }
}
