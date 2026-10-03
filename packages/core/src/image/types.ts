export type ImageProviderMode = "manual" | "api";

export type ImageOperation = "generate_anchor" | "derive_scene";

export type ImageAssetStatus =
  | "planned"
  | "awaiting_generation"
  | "awaiting_import"
  | "qa_pending"
  | "approved"
  | "rejected"
  | "needs_human_review";

export interface ImageOutputSpec {
  aspectRatio: "9:16" | "16:9" | "1:1";
  width: number;
  height: number;
  transparentBackground?: boolean;
}

export interface BaseImageSpec {
  projectId: string;
  sceneId?: string;
  outputAssetId: string;
  entityIds: string[];
  prompt: string;
  negativeConstraints: string[];
  continuityConstraints: string[];
  technicalConstraints: string[];
  outputSpec: ImageOutputSpec;
  attempt: number;
}

export interface GenerateAnchorSpec extends BaseImageSpec {
  referenceAssetIds?: never[];
}

export interface DeriveSceneSpec extends BaseImageSpec {
  sceneId: string;
  referenceAssetIds: string[];
}

export interface ImageProviderJob {
  jobId: string;
  providerId: string;
  providerMode: ImageProviderMode;
  operation: ImageOperation;
  projectId: string;
  sceneId?: string;
  outputAssetId: string;
  referenceAssetIds: string[];
  prompt: string;
  negativeConstraints: string[];
  continuityConstraints: string[];
  technicalConstraints: string[];
  outputSpec: ImageOutputSpec;
  status: "pending" | "requires_user_action" | "running" | "completed" | "failed";
  attempt: number;
  userInstructions?: string;
  error?: string;
}

export interface ImageAsset {
  assetId: string;
  projectId: string;
  sceneId?: string;
  assetRole: "anchor" | "derived";
  status: ImageAssetStatus;
  entityIds: string[];
  parentAssetIds: string[];
  attempt: number;
  provenance: {
    providerId: string;
    providerMode: ImageProviderMode | "import";
    operation: ImageOperation | "import_existing";
    sourceUri?: string;
    promptSnapshot?: string;
    notes?: string;
  };
  file: {
    uri?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    checksum?: string;
  };
  qaResultIds?: string[];
}

export type ImageProviderResult =
  | {
      kind: "completed";
      asset: ImageAsset;
    }
  | {
      kind: "requires_user_action";
      job: ImageProviderJob;
    };
