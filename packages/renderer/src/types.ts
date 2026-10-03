import type { MotionSpec } from "@ai-explainer-studio/core";

export interface RendererAssetMap {
  [assetId: string]: string;
}

export interface ExplainerVideoProps {
  motionSpec: MotionSpec;
  assets: RendererAssetMap;
}
