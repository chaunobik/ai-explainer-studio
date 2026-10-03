export function windowOpacity(
  frame: number,
  start: number,
  end: number,
  preferredFadeFrames: number,
): number {
  if (!Number.isFinite(frame) || !Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }
  if (end <= start || frame < start || frame > end) return 0;

  const duration = end - start;
  const fade = Math.min(
    Math.max(0, preferredFadeFrames),
    Math.max(0, duration / 3),
  );

  if (fade <= 0) return 1;

  if (frame < start + fade) {
    return Math.max(0, Math.min(1, (frame - start) / fade));
  }

  if (frame > end - fade) {
    return Math.max(0, Math.min(1, (end - frame) / fade));
  }

  return 1;
}
