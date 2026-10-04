import type {MotionSpec, SubtitleCue} from "@ai-explainer-studio/core";

export interface RendererAssetMap {
  [assetId: string]: string;
}

export interface RendererAudioMap {
  [sceneId: string]: string;
}

export interface RendererVideoMap {
  [sceneId: string]: string;
}

export interface ExplainerVideoProps {
  motionSpec: MotionSpec;
  assets: RendererAssetMap;
  audioByScene?: RendererAudioMap;
  videoByScene?: RendererVideoMap;
  subtitleCues?: SubtitleCue[];
}
