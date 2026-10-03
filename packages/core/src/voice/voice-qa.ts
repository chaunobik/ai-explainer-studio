import type {ValidationIssue, ValidationReport} from "../pipeline/types";
import type {VoiceAsset, VoiceSpec} from "./types";

export interface VoiceQaOptions {
  overrunToleranceSec?: number;
  shortWarningRatio?: number;
  requireApproved?: boolean;
}

function add(
  issues: ValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: "error" | "warning" = "error",
): void {
  issues.push({code, path, message, severity});
}

export function validateVoiceAssets(
  spec: VoiceSpec,
  assets: VoiceAsset[],
  options: VoiceQaOptions = {},
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const tolerance = options.overrunToleranceSec ?? 0.35;
  const shortRatio = options.shortWarningRatio ?? 0.6;
  const requireApproved = options.requireApproved ?? false;

  const byId = new Map(assets.map((asset) => [asset.asset_id, asset]));
  const seenSceneIds = new Set<string>();

  for (const [index, segment] of spec.segments.entries()) {
    const asset = byId.get(segment.output_asset_id);
    if (!asset) {
      add(
        issues,
        "VOICE_MISSING_ASSET",
        `voice.segments[${index}]`,
        `Missing voice asset ${segment.output_asset_id} for ${segment.scene_id}.`,
      );
      continue;
    }

    if (seenSceneIds.has(asset.scene_id)) {
      add(
        issues,
        "VOICE_DUP_SCENE",
        `voice.assets.${asset.asset_id}`,
        `Multiple voice assets map to scene ${asset.scene_id}.`,
      );
    }
    seenSceneIds.add(asset.scene_id);

    if (asset.scene_id !== segment.scene_id) {
      add(
        issues,
        "VOICE_SCENE_MISMATCH",
        `voice.assets.${asset.asset_id}`,
        `Asset ${asset.asset_id} belongs to ${asset.scene_id}, expected ${segment.scene_id}.`,
      );
    }

    if (asset.text !== segment.text) {
      add(
        issues,
        "VOICE_TEXT_DRIFT",
        `voice.assets.${asset.asset_id}.text`,
        "Imported voice asset text must exactly match the approved narration text.",
      );
    }

    const duration = asset.file.duration_sec;
    if (duration == null || !Number.isFinite(duration)) {
      add(
        issues,
        "VOICE_DURATION_MISSING",
        `voice.assets.${asset.asset_id}.file.duration_sec`,
        "Voice asset duration is required for timing QA.",
      );
    } else {
      if (duration > segment.target_duration_sec + tolerance) {
        add(
          issues,
          "VOICE_OVERRUN",
          `voice.assets.${asset.asset_id}.file.duration_sec`,
          `Audio duration ${duration}s exceeds scene target ${segment.target_duration_sec}s plus tolerance ${tolerance}s.`,
        );
      }

      if (duration < segment.target_duration_sec * shortRatio) {
        add(
          issues,
          "VOICE_TOO_SHORT",
          `voice.assets.${asset.asset_id}.file.duration_sec`,
          `Audio duration ${duration}s is unusually short for the ${segment.target_duration_sec}s scene.`,
          "warning",
        );
      }
    }

    if (requireApproved && asset.status !== "approved") {
      add(
        issues,
        "VOICE_NOT_APPROVED",
        `voice.assets.${asset.asset_id}.status`,
        `Voice asset ${asset.asset_id} must be approved before final rendering.`,
      );
    }
  }

  const expectedIds = new Set(spec.segments.map((segment) => segment.output_asset_id));
  for (const asset of assets) {
    if (!expectedIds.has(asset.asset_id)) {
      add(
        issues,
        "VOICE_EXTRA_ASSET",
        `voice.assets.${asset.asset_id}`,
        `Voice asset ${asset.asset_id} is not declared by VoiceSpec.`,
        "warning",
      );
    }
  }

  const errors = issues.filter((value) => value.severity === "error");
  const warnings = issues.filter((value) => value.severity === "warning");
  return {ok: errors.length === 0, errors, warnings};
}


export interface StoryboardNarrationLike {
  scenes: Array<{
    scene_id: string;
    narration: string;
    duration_sec: number;
  }>;
}

export function validateVoiceSpecAgainstStoryboard(
  spec: VoiceSpec,
  storyboard: StoryboardNarrationLike,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const sceneMap = new Map(
    storyboard.scenes.map((scene) => [scene.scene_id, scene]),
  );
  const segmentSceneIds = spec.segments.map((segment) => segment.scene_id);
  const assetIds = spec.segments.map((segment) => segment.output_asset_id);

  if (new Set(segmentSceneIds).size !== segmentSceneIds.length) {
    add(issues, "VOICE_SPEC_DUP_SCENE", "voice.segments", "VoiceSpec scene IDs must be unique.");
  }

  if (new Set(assetIds).size !== assetIds.length) {
    add(issues, "VOICE_SPEC_DUP_ASSET", "voice.segments", "Voice output asset IDs must be unique.");
  }

  for (const [index, segment] of spec.segments.entries()) {
    const scene = sceneMap.get(segment.scene_id);
    if (!scene) {
      add(
        issues,
        "VOICE_SPEC_UNKNOWN_SCENE",
        `voice.segments[${index}].scene_id`,
        `Voice segment references unknown scene ${segment.scene_id}.`,
      );
      continue;
    }

    if (segment.text !== scene.narration) {
      add(
        issues,
        "VOICE_SPEC_TEXT_DRIFT",
        `voice.segments[${index}].text`,
        `Voice text for ${segment.scene_id} must exactly match storyboard narration.`,
      );
    }

    if (Math.abs(segment.target_duration_sec - scene.duration_sec) > 0.001) {
      add(
        issues,
        "VOICE_SPEC_DURATION_DRIFT",
        `voice.segments[${index}].target_duration_sec`,
        `Voice target ${segment.target_duration_sec}s does not match scene duration ${scene.duration_sec}s.`,
      );
    }
  }

  const expectedSceneIds = new Set(storyboard.scenes.map((scene) => scene.scene_id));
  for (const sceneId of expectedSceneIds) {
    if (!segmentSceneIds.includes(sceneId)) {
      add(
        issues,
        "VOICE_SPEC_MISSING_SCENE",
        "voice.segments",
        `VoiceSpec is missing narration for ${sceneId}.`,
      );
    }
  }

  const errors = issues.filter((value) => value.severity === "error");
  const warnings = issues.filter((value) => value.severity === "warning");
  return {ok: errors.length === 0, errors, warnings};
}
