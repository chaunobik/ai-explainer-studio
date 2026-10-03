import type {
  DeriveSceneSpec,
  GenerateAnchorSpec,
  ImageProviderMode,
  ImageProviderResult,
} from "./types";

export interface ImageProvider {
  readonly id: string;
  readonly mode: ImageProviderMode;

  generateAnchor(spec: GenerateAnchorSpec): Promise<ImageProviderResult>;

  deriveScene(spec: DeriveSceneSpec): Promise<ImageProviderResult>;
}
