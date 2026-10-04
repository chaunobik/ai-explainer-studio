export interface VieNeuClientOptions {
  baseUrl?: string;
  model?: string;
  voice?: string;
}

export class VieNeuClient {
  readonly baseUrl: string;
  readonly model: string;
  readonly voice: string;

  constructor(options: VieNeuClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:8000").replace(/\/$/, "");
    this.model = options.model ?? "vieneu-v3-turbo";
    this.voice = options.voice ?? "Mai Anh";
  }

  async health(): Promise<{ok: boolean; detail: string}> {
    try {
      const response = await fetch(this.baseUrl + "/health");
      return response.ok
        ? {ok: true, detail: "VieNeu reachable"}
        : {ok: false, detail: `HTTP ${response.status}`};
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async voices(): Promise<unknown> {
    const response = await fetch(this.baseUrl + "/v1/voices");
    if (!response.ok) {
      throw new Error(`VieNeu voices failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async synthesize(
    text: string,
    options: {voice?: string; model?: string; format?: "wav" | "pcm"} = {},
  ): Promise<Uint8Array> {
    const response = await fetch(this.baseUrl + "/v1/audio/speech", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer x",
      },
      body: JSON.stringify({
        model: options.model ?? this.model,
        voice: options.voice ?? this.voice,
        input: text,
        response_format: options.format ?? "wav",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `VieNeu speech failed: HTTP ${response.status} ${await response.text()}`,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }
}
