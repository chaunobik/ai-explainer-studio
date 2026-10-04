import {randomUUID} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ComfyFileRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

export class ComfyUiClient {
  constructor(
    readonly baseUrl = process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188",
    readonly timeoutMs = Number(process.env.COMFYUI_TIMEOUT_MS ?? 900_000),
  ) {}

  private url(pathname: string): string {
    return this.baseUrl.replace(/\/$/, "") + pathname;
  }

  async health(): Promise<void> {
    const response = await fetch(this.url("/queue"));
    if (!response.ok) {
      throw new Error(`ComfyUI health check failed: HTTP ${response.status}`);
    }
  }

  async objectInfo(node?: string): Promise<any> {
    const suffix = node ? `/${encodeURIComponent(node)}` : "";
    const response = await fetch(this.url(`/object_info${suffix}`));
    if (!response.ok) {
      throw new Error(`ComfyUI object info failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async validateCoreImageRuntime(checkpoint: string): Promise<void> {
    const requiredNodes = [
      "CheckpointLoaderSimple",
      "CLIPTextEncode",
      "EmptyLatentImage",
      "LoadImage",
      "ImageCrop",
      "ImageScale",
      "VAEEncode",
      "VAEDecode",
      "KSampler",
      "SaveImage",
    ];

    const info = await this.objectInfo();
    const missing = requiredNodes.filter((node) => !info?.[node]);
    if (missing.length > 0) {
      throw new Error(
        `ComfyUI is missing required core nodes: ${missing.join(", ")}`,
      );
    }

    const checkpointInfo = info.CheckpointLoaderSimple;
    const values =
      checkpointInfo?.input?.required?.ckpt_name?.[0] ??
      checkpointInfo?.input?.required?.ckpt_name?.[0]?.[0] ??
      [];
    const names = Array.isArray(values) ? values : [];
    if (names.length > 0 && !names.includes(checkpoint)) {
      throw new Error(
        `COMFYUI_CHECKPOINT "${checkpoint}" is not available. Found: ${names
          .slice(0, 12)
          .join(", ")}`,
      );
    }
  }

  async uploadImage(filePath: string): Promise<ComfyFileRef> {
    const bytes = fs.readFileSync(filePath);
    const form = new FormData();
    form.append("image", new Blob([bytes]), path.basename(filePath));
    form.append("type", "input");
    form.append("overwrite", "true");

    const response = await fetch(this.url("/upload/image"), {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      throw new Error(
        `ComfyUI image upload failed: HTTP ${response.status} ${await response.text()}`,
      );
    }
    const result = (await response.json()) as {
      name: string;
      subfolder?: string;
      type?: string;
    };
    return {
      filename: result.name,
      subfolder: result.subfolder ?? "",
      type: result.type ?? "input",
    };
  }

  async queuePrompt(prompt: Record<string, unknown>): Promise<string> {
    const response = await fetch(this.url("/prompt"), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        prompt,
        client_id: randomUUID(),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ComfyUI queue failed: HTTP ${response.status} ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      prompt_id?: string;
      error?: unknown;
      node_errors?: unknown;
    };
    if (!data.prompt_id) {
      throw new Error(
        `ComfyUI did not return prompt_id: ${JSON.stringify(data)}`,
      );
    }
    return data.prompt_id;
  }

  async waitForHistory(promptId: string): Promise<any> {
    const started = Date.now();
    while (Date.now() - started < this.timeoutMs) {
      const response = await fetch(
        this.url(`/history/${encodeURIComponent(promptId)}`),
      );
      if (!response.ok) {
        throw new Error(`ComfyUI history failed: HTTP ${response.status}`);
      }
      const data = (await response.json()) as Record<string, any>;
      const entry = data[promptId];
      if (entry) {
        const status = entry.status;
        if (status?.status_str === "error" || status?.completed === false) {
          throw new Error(
            `ComfyUI execution failed: ${JSON.stringify(status)}`,
          );
        }
        if (entry.outputs) return entry;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(
      `ComfyUI prompt ${promptId} timed out after ${this.timeoutMs} ms.`,
    );
  }

  findOutput(entry: any): ComfyFileRef {
    const buckets = ["images", "gifs", "videos", "audio", "files"];
    for (const output of Object.values(entry.outputs ?? {}) as any[]) {
      for (const bucket of buckets) {
        const values = output?.[bucket];
        if (!Array.isArray(values)) continue;
        const found = values.find(
          (item: any) => item?.filename && typeof item.filename === "string",
        );
        if (found) {
          return {
            filename: found.filename,
            subfolder: found.subfolder ?? "",
            type: found.type ?? "output",
          };
        }
      }
    }
    throw new Error("ComfyUI completed but returned no downloadable output.");
  }

  async download(ref: ComfyFileRef, outputPath: string): Promise<void> {
    const query = new URLSearchParams({
      filename: ref.filename,
      subfolder: ref.subfolder ?? "",
      type: ref.type ?? "output",
    });
    const response = await fetch(this.url(`/view?${query.toString()}`));
    if (!response.ok) {
      throw new Error(`ComfyUI output download failed: HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, bytes);
  }

  async runToFile(
    prompt: Record<string, unknown>,
    outputPath: string,
  ): Promise<string> {
    const promptId = await this.queuePrompt(prompt);
    const history = await this.waitForHistory(promptId);
    const ref = this.findOutput(history);
    await this.download(ref, outputPath);
    return promptId;
  }
}
