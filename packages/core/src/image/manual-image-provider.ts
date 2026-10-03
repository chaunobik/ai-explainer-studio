import type { ImageProvider } from "./image-provider";
import type {
  DeriveSceneSpec,
  GenerateAnchorSpec,
  ImageProviderJob,
  ImageProviderResult,
} from "./types";

export class ManualImageProvider implements ImageProvider {
  readonly id = "manual-chatgpt-image";
  readonly mode = "manual" as const;

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
    operation: "generate_anchor" | "derive_scene",
    spec: GenerateAnchorSpec | DeriveSceneSpec,
    referenceAssetIds: string[],
  ): ImageProviderJob {
    return {
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
        operation === "generate_anchor"
          ? "Use this prompt package in ChatGPT Image, then import the approved result into the project."
          : "Upload the approved reference asset(s) to ChatGPT Image, apply this edit prompt, then import the derived result.",
    };
  }
}
