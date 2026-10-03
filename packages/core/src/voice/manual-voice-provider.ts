import type {VoiceProvider} from "./voice-provider";
import type {VoiceProviderJob, VoiceSpec} from "./types";

export class ManualVoiceProvider implements VoiceProvider {
  readonly id = "manual-tts";
  readonly mode = "manual" as const;

  createJobs(spec: VoiceSpec, attempt = 0): VoiceProviderJob[] {
    const styleNotes = [
      spec.style?.persona ? `Persona: ${spec.style.persona}` : undefined,
      spec.style?.pace ? `Pace: ${spec.style.pace}` : undefined,
      spec.style?.energy ? `Energy: ${spec.style.energy}` : undefined,
      ...(spec.style?.notes ?? []),
    ].filter((value): value is string => Boolean(value));

    const pronunciation = (spec.pronunciation_dictionary ?? []).map(
      (entry) => `Pronounce "${entry.term}" as "${entry.pronunciation}".`,
    );

    return spec.segments.map((segment) => ({
      job_id: [
        this.id,
        spec.project_id,
        segment.scene_id,
        segment.output_asset_id,
        String(attempt),
      ].join(":"),
      provider_id: spec.provider_id,
      provider_mode: this.mode,
      project_id: spec.project_id,
      scene_id: segment.scene_id,
      text: segment.text,
      target_duration_sec: segment.target_duration_sec,
      output_asset_id: segment.output_asset_id,
      status: "requires_user_action",
      attempt,
      delivery_notes: [
        ...styleNotes,
        ...pronunciation,
        ...(segment.delivery_notes ?? []),
      ],
      user_instructions:
        "Generate exactly this narration text with the requested delivery, export one WAV/MP3 file for this scene, then import it without changing wording.",
      error: null,
    }));
  }
}
