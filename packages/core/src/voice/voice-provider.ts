import type {VoiceProviderJob, VoiceSpec} from "./types";

export interface VoiceProvider {
  readonly id: string;
  readonly mode: "manual" | "api";
  createJobs(spec: VoiceSpec, attempt?: number): VoiceProviderJob[];
}
