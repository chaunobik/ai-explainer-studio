import type {SubtitleCue, VoiceAsset, VoiceSpec} from "./types";

function chunkWords(text: string, maxWords: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const limit = Math.max(1, maxWords);
  const chunkCount = Math.max(1, Math.ceil(words.length / limit));
  const baseSize = Math.floor(words.length / chunkCount);
  const remainder = words.length % chunkCount;

  const chunks: string[] = [];
  let cursor = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    chunks.push(words.slice(cursor, cursor + size).join(" "));
    cursor += size;
  }

  return chunks;
}

export function buildSceneSubtitleCues(
  sceneId: string,
  text: string,
  durationSec: number,
  maxWords = 6,
): SubtitleCue[] {
  const chunks = chunkWords(text, Math.max(1, maxWords));
  if (chunks.length === 0 || durationSec <= 0) return [];

  const weights = chunks.map((chunk) => chunk.split(/\s+/).length);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  let cursor = 0;
  return chunks.map((chunk, index) => {
    const duration =
      index === chunks.length - 1
        ? durationSec - cursor
        : (durationSec * weights[index]) / totalWeight;
    const start = cursor;
    const end = index === chunks.length - 1 ? durationSec : cursor + duration;
    cursor = end;

    return {
      scene_id: sceneId,
      start_sec: Number(start.toFixed(3)),
      end_sec: Number(end.toFixed(3)),
      text: chunk,
    };
  });
}

export function buildSubtitleCues(
  spec: VoiceSpec,
  assets: VoiceAsset[],
  maxWords = 6,
): SubtitleCue[] {
  const byId = new Map(assets.map((asset) => [asset.asset_id, asset]));

  return spec.segments.flatMap((segment) => {
    const asset = byId.get(segment.output_asset_id);
    const duration =
      asset?.file.duration_sec && asset.file.duration_sec > 0
        ? asset.file.duration_sec
        : segment.target_duration_sec;

    return buildSceneSubtitleCues(
      segment.scene_id,
      segment.text,
      duration,
      maxWords,
    );
  });
}
