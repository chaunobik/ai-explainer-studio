import fs from "node:fs";
import path from "node:path";

export class VieNeuClient {
  constructor(
    readonly baseUrl = process.env.VIENEU_BASE_URL ?? "http://127.0.0.1:8000",
    readonly apiKey = process.env.VIENEU_API_KEY ?? "",
  ) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      ...(this.apiKey ? {Authorization: `Bearer ${this.apiKey}`} : {}),
      ...extra,
    };
  }

  async health(): Promise<any> {
    const response = await fetch(this.baseUrl.replace(/\/$/, "") + "/health", {
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(`VieNeu health check failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async voices(): Promise<any[]> {
    const response = await fetch(
      this.baseUrl.replace(/\/$/, "") + "/v1/voices",
      {headers: this.headers()},
    );
    if (!response.ok) {
      throw new Error(`VieNeu voices request failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as {data?: any[]};
    return data.data ?? [];
  }

  async synthesize(input: {
    text: string;
    outputPath: string;
    voice?: string;
    sampleRate?: number;
  }): Promise<void> {
    const response = await fetch(
      this.baseUrl.replace(/\/$/, "") + "/v1/audio/speech",
      {
        method: "POST",
        headers: this.headers({"Content-Type": "application/json"}),
        body: JSON.stringify({
          model: "vieneu-v3-turbo",
          input: input.text,
          voice: input.voice ?? process.env.VIENEU_VOICE ?? "Mai Anh",
          response_format: "wav",
          stream_format: "audio",
          sample_rate: input.sampleRate ?? 48_000,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `VieNeu synthesis failed: HTTP ${response.status} ${await response.text()}`,
      );
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(input.outputPath), {recursive: true});
    fs.writeFileSync(input.outputPath, bytes);
  }
}
