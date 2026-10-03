export interface VoiceSegment {
  scene_id: string;
  text: string;
  target_duration_sec: number;
  output_asset_id: string;
  delivery_notes?: string[];
}

export interface VoiceSpec {
  voice_plan_id: string;
  project_id: string;
  language: "vi-VN";
  provider_id: string;
  style?: {
    persona?: string;
    pace?: string;
    energy?: string;
    notes?: string[];
  };
  pronunciation_dictionary?: Array<{
    term: string;
    pronunciation: string;
  }>;
  segments: VoiceSegment[];
}

export interface VoiceProviderJob {
  job_id: string;
  provider_id: string;
  provider_mode: "manual" | "api";
  project_id: string;
  scene_id: string;
  text: string;
  target_duration_sec: number;
  output_asset_id: string;
  status: "pending" | "requires_user_action" | "running" | "completed" | "failed";
  attempt: number;
  delivery_notes?: string[];
  user_instructions?: string | null;
  error?: string | null;
}

export interface VoiceAsset {
  asset_id: string;
  project_id: string;
  scene_id: string;
  status:
    | "planned"
    | "awaiting_generation"
    | "awaiting_import"
    | "qa_pending"
    | "approved"
    | "rejected"
    | "needs_human_review";
  text: string;
  attempt: number;
  provider_id: string;
  file: {
    uri?: string | null;
    mime_type?: string | null;
    duration_sec?: number | null;
    checksum?: string | null;
  };
  qa_result_ids?: string[];
}

export interface SubtitleCue {
  scene_id: string;
  start_sec: number;
  end_sec: number;
  text: string;
}
