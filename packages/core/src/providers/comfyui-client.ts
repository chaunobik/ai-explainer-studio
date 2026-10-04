export interface ComfyUiOutputRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

export interface ComfyUiHistoryEntry {
  outputs?: Record<string, {
    images?: ComfyUiOutputRef[];
    gifs?: ComfyUiOutputRef[];
    videos?: ComfyUiOutputRef[];
    [key: string]: unknown;
  }>;
  status?: {status_str?: string; completed?: boolean};
  [key: string]: unknown;
}

export interface ComfyUiClientOptions {
  baseUrl?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class ComfyUiClient {
  readonly baseUrl: string;
  readonly pollIntervalMs: number;
  readonly timeoutMs: number;

  constructor(options: ComfyUiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:8188").replace(/\/$/, "");
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 20 * 60 * 1000;
  }

  async health(): Promise<{ok: boolean; detail: string}> {
    try {
      const response = await fetch(this.baseUrl + "/system_stats");
      if (response.ok) return {ok: true, detail: "ComfyUI reachable"};
      const queue = await fetch(this.baseUrl + "/queue");
      return queue.ok
        ? {ok: true, detail: "ComfyUI reachable"}
        : {ok: false, detail: `HTTP ${response.status}`};
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async queuePrompt(workflow: Record<string, unknown>): Promise<string> {
    const response = await fetch(this.baseUrl + "/prompt", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({prompt: workflow}),
    });
    if (!response.ok) {
      throw new Error(
        `ComfyUI /prompt failed: HTTP ${response.status} ${await response.text()}`,
      );
    }
    const body = (await response.json()) as {prompt_id?: string; error?: unknown};
    if (!body.prompt_id) {
      throw new Error(`ComfyUI did not return prompt_id: ${JSON.stringify(body)}`);
    }
    return body.prompt_id;
  }

  async getHistory(promptId: string): Promise<ComfyUiHistoryEntry | null> {
    const response = await fetch(
      this.baseUrl + "/history/" + encodeURIComponent(promptId),
    );
    if (!response.ok) {
      throw new Error(`ComfyUI history failed: HTTP ${response.status}`);
    }
    const body = (await response.json()) as Record<string, ComfyUiHistoryEntry>;
    return body[promptId] ?? null;
  }

  async waitForCompletion(promptId: string): Promise<ComfyUiHistoryEntry> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < this.timeoutMs) {
      const history = await this.getHistory(promptId);
      if (history) {
        const status = history.status?.status_str;
        if (status === "error") {
          throw new Error(`ComfyUI prompt ${promptId} failed.`);
        }
        if (history.status?.completed || history.outputs) return history;
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }
    throw new Error(
      `ComfyUI prompt ${promptId} timed out after ${this.timeoutMs} ms.`,
    );
  }

  collectOutputs(history: ComfyUiHistoryEntry): ComfyUiOutputRef[] {
    const outputs: ComfyUiOutputRef[] = [];
    for (const nodeOutput of Object.values(history.outputs ?? {})) {
      for (const key of ["images", "gifs", "videos"] as const) {
        const refs = nodeOutput[key];
        if (Array.isArray(refs)) outputs.push(...refs);
      }
    }
    return outputs;
  }

  async downloadOutput(ref: ComfyUiOutputRef): Promise<Uint8Array> {
    const params = new URLSearchParams({
      filename: ref.filename,
      subfolder: ref.subfolder ?? "",
      type: ref.type ?? "output",
    });
    const response = await fetch(this.baseUrl + "/view?" + params.toString());
    if (!response.ok) {
      throw new Error(
        `ComfyUI output download failed: HTTP ${response.status}`,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async uploadImage(
    bytes: Uint8Array,
    filename: string,
    overwrite = true,
  ): Promise<{name: string; subfolder?: string; type?: string}> {
    const form = new FormData();
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    form.append("image", new Blob([arrayBuffer]), filename);
    form.append("overwrite", String(overwrite));

    const response = await fetch(this.baseUrl + "/upload/image", {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      throw new Error(
        `ComfyUI image upload failed: HTTP ${response.status} ${await response.text()}`,
      );
    }
    return (await response.json()) as {
      name: string;
      subfolder?: string;
      type?: string;
    };
  }

  async run(workflow: Record<string, unknown>): Promise<ComfyUiHistoryEntry> {
    const promptId = await this.queuePrompt(workflow);
    return this.waitForCompletion(promptId);
  }
}
