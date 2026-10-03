import type {
  DeriveSceneSpec,
  GenerateAnchorSpec,
  GenerateReferencePackSpec,
  ImageProviderMode,
  ImageProviderResult,
} from "./types";

export interface ImageProvider {
  readonly id: string;
  readonly mode: ImageProviderMode;

  generateReferencePack(spec: GenerateReferencePackSpec): Promise<ImageProviderResult>;

  generateAnchor(spec: GenerateAnchorSpec): Promise<ImageProviderResult>;

  deriveScene(spec: DeriveSceneSpec): Promise<ImageProviderResult>;
}
