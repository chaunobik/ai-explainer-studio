import Link from "next/link";
import {CopyButton} from "../../../components/CopyButton";
import {loadProjectDashboard} from "../../../lib/project-runtime";
import {
  savePromptQaAction,
  setImageDecisionAction,
  setVoiceDecisionAction,
  uploadImageAction,
  uploadVoiceAction,
} from "./actions";

type SearchParams = {
  notice?: string;
  error?: string;
};

const stageOrder = [
  ["research", "Research"],
  ["script", "Script"],
  ["storyboard", "Storyboard"],
  ["visual_plan", "Visual Plan"],
  ["image_prompt", "Image Prompt"],
  ["visual_assets", "Images"],
  ["voice", "Voice"],
  ["motion", "Motion"],
  ["final", "Final"],
] as const;

function stageState(checks: any[], stage: string): "pass" | "action" | "blocked" | "review" {
  const items = checks.filter((check) => check.stage === stage);
  if (items.some((check) => check.status === "needs_human_review")) return "review";
  if (items.some((check) => check.status === "action_required" || check.status === "ready")) return "action";
  if (items.length > 0 && items.every((check) => check.status === "pass")) return "pass";
  return "blocked";
}

function stateLabel(state: ReturnType<typeof stageState>): string {
  if (state === "pass") return "PASS";
  if (state === "action") return "ACTION";
  if (state === "review") return "REVIEW";
  return "WAITING";
}

function overallClass(status: string): string {
  if (status === "complete" || status === "render_ready") return "pass";
  if (status === "needs_human_review") return "review";
  if (status === "blocked") return "blocked";
  return "action";
}

export default function ProjectPage({
  params,
  searchParams,
}: {
  params: {slug: string};
  searchParams: SearchParams;
}) {
  const data = loadProjectDashboard(params.slug);
  const currentStage = data.guided.stage;
  const passed = stageOrder.filter(([stage]) => stageState(data.report.checks, stage) === "pass").length;
  const progress = Math.round((passed / stageOrder.length) * 100);
  const assetId = data.guided.asset_id;
  const prompt = assetId
    ? data.promptSpecs.find((value: any) => value.asset_id === assetId)
    : undefined;
  const asset = assetId
    ? data.imageManifest.assets.find((value: any) => value.asset_id === assetId)
    : undefined;
  const voiceAsset = assetId
    ? data.voiceManifest.assets.find((value: any) => value.asset_id === assetId)
    : undefined;
  const voiceSegment = assetId
    ? data.voiceSpec.segments.find((value: any) => value.output_asset_id === assetId)
    : undefined;

  const qaPackage =
    data.guided.kind === "prompt_qa" && prompt
      ? data.promptQaTemplate +
        "\n\n--- INPUT ImagePromptSpec ---\n" +
        JSON.stringify(prompt, null, 2)
      : "";

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <Link className="eyebrow" href="/">← AI Explainer Studio</Link>
          <h1>{data.manifest.topic}</h1>
          <p className="muted">
            <span className="mono">{data.manifest.project_id}</span> · Guided local workflow
          </p>
        </div>
        <span className={"status-pill " + overallClass(data.report.overall_status)}>
          {data.report.overall_status.replaceAll("_", " ")}
        </span>
      </div>

      {searchParams.notice ? <div className="notice">{searchParams.notice}</div> : null}
      {searchParams.error ? <div className="error-banner">{searchParams.error}</div> : null}

      <div className="dashboard">
        <aside>
          <section className="panel">
            <div className="eyebrow">Pipeline</div>
            <div className="progress-track" aria-label={"Progress " + progress + "%"}>
              <div className="progress-bar" style={{width: progress + "%"}} />
            </div>
            <p className="small muted">{progress}% stages PASS</p>

            <div className="pipeline-list">
              {stageOrder.map(([stage, label]) => {
                const state = stageState(data.report.checks, stage);
                const active = currentStage === stage;
                return (
                  <div className={"stage " + state + (active ? " active" : "")} key={stage}>
                    <div className="stage-dot">
                      {state === "pass" ? "✓" : state === "action" ? "!" : state === "review" ? "?" : "·"}
                    </div>
                    <div>
                      <div className="stage-label">{label}</div>
                      <div className="stage-sub">{active ? "Current focus" : ""}</div>
                    </div>
                    <div className="stage-state">{stateLabel(state)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <section>
          <div className="panel next-card">
            <div className="next-title-row">
              <div>
                <div className="eyebrow">Next Action</div>
                <h2>{data.guided.title}</h2>
              </div>
              <span className="next-badge">{data.guided.stage}</span>
            </div>

            <p className="next-reason">{data.guided.reason}</p>

            <h3>Thực hiện</h3>
            <ol className="instruction-list">
              {data.guided.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>

            <div className="action-box">
              {data.guided.kind === "upload_image" && assetId ? (
                <form action={uploadImageAction}>
                  <input type="hidden" name="slug" value={params.slug} />
                  <input type="hidden" name="assetId" value={assetId} />
                  <div className="form-row">
                    <label htmlFor="image-file">Chọn ảnh {assetId}</label>
                    <input id="image-file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
                  </div>
                  <div className="button-row">
                    <button className="button" type="submit">{data.guided.primary_action.label}</button>
                  </div>
                </form>
              ) : null}

              {data.guided.kind === "review_image" && assetId ? (
                <div>
                  <img
                    className="asset-preview"
                    src={"/api/projects/" + params.slug + "/assets/" + assetId}
                    alt={"Preview " + assetId}
                  />
                  <form action={setImageDecisionAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="assetId" value={assetId} />
                    <div className="form-row">
                      <label htmlFor="qa-id">QA / review ID</label>
                      <input
                        id="qa-id"
                        name="qaId"
                        type="text"
                        defaultValue={assetId === "A0" ? "MANUAL-REF-A0" : ""}
                        placeholder={assetId === "A0" ? "MANUAL-REF-A0" : "VD: QA-VISUAL-A1-001"}
                      />
                    </div>
                    <div className="button-row">
                      <button className="button success" name="decision" value="approved" type="submit">
                        Approve {assetId}
                      </button>
                      <button className="button danger" name="decision" value="rejected" type="submit">
                        Reject {assetId}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "prompt_qa" && prompt ? (
                <div>
                  <div className="button-row">
                    <CopyButton text={qaPackage} label="Copy Prompt QA Package" />
                  </div>
                  <details>
                    <summary className="small"><strong>Xem detailed prompt {prompt.prompt_id}</strong></summary>
                    <pre className="prompt-box">{prompt.final_prompt}</pre>
                  </details>
                  <form action={savePromptQaAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="assetId" value={prompt.asset_id} />
                    <div className="form-row">
                      <label htmlFor="qa-json">Dán QA JSON từ ChatGPT</label>
                      <textarea
                        id="qa-json"
                        name="qaJson"
                        placeholder={'{"prompt_id":"' + prompt.prompt_id + '","status":"pass",...}'}
                        required
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">Lưu Prompt QA & tiếp tục</button>
                    </div>
                  </form>
                </div>
              ) : null}

              {(data.guided.kind === "generate_image" || data.guided.kind === "repair_image") && prompt && assetId ? (
                <div>
                  <p className="small muted">
                    Reference: {(prompt.reference_asset_ids ?? []).join(", ") || "none"} · Prompt: {prompt.prompt_id}
                  </p>
                  <div className="button-row">
                    <CopyButton text={prompt.final_prompt} label="Copy Image Prompt" />
                  </div>
                  <pre className="prompt-box">{prompt.final_prompt}</pre>
                  <form action={uploadImageAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="assetId" value={assetId} />
                    <div className="form-row">
                      <label htmlFor="generated-file">Sau khi tạo ảnh trong ChatGPT, import {assetId} tại đây</label>
                      <input id="generated-file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">Import {assetId} & kiểm tra tiếp</button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "upload_voice" && assetId && voiceSegment ? (
                <div>
                  <div className="action-box">
                    <div className="eyebrow">Narration</div>
                    <p>{voiceSegment.text}</p>
                    <p className="small muted">
                      Scene {voiceSegment.scene_id} · target {voiceSegment.target_duration_sec}s
                    </p>
                  </div>
                  <form action={uploadVoiceAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="assetId" value={assetId} />
                    <div className="form-row">
                      <label htmlFor="voice-file">Chọn audio {assetId}</label>
                      <input id="voice-file" name="file" type="file" accept="audio/mpeg,audio/wav,audio/mp4" required />
                    </div>
                    <div className="form-row">
                      <label htmlFor="voice-duration">Duration thực tế (giây)</label>
                      <input
                        id="voice-duration"
                        name="duration"
                        type="number"
                        min="0.1"
                        step="0.01"
                        placeholder="WAV có thể để trống; MP3/M4A cần nhập"
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">Import {assetId} & sang Voice QA</button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "review_voice" && assetId && voiceAsset ? (
                <div>
                  <div className="action-box">
                    <div className="eyebrow">Narration</div>
                    <p>{voiceAsset.text}</p>
                  </div>
                  <audio
                    className="audio-preview"
                    controls
                    src={"/api/projects/" + params.slug + "/voice/" + assetId}
                  />
                  <form action={setVoiceDecisionAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="assetId" value={assetId} />
                    <div className="form-row">
                      <label htmlFor="voice-qa-id">Voice QA ID</label>
                      <input
                        id="voice-qa-id"
                        name="qaId"
                        type="text"
                        placeholder={"VD: QA-VOICE-" + assetId}
                      />
                    </div>
                    <div className="button-row">
                      <button className="button success" name="decision" value="approved" type="submit">
                        Approve {assetId}
                      </button>
                      <button className="button danger" name="decision" value="rejected" type="submit">
                        Reject {assetId}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {!["upload_image", "review_image", "prompt_qa", "generate_image", "repair_image", "upload_voice", "review_voice"].includes(data.guided.kind) ? (
                <div>
                  <p className="muted">
                    Readiness engine đã xác định bước này. Điều kiện hoàn thành được hiển thị ngay bên dưới.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="spacer" />
            <h3>Khi nào được coi là xong?</h3>
            <ul className="check-list">
              {data.guided.completion_criteria.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          {asset ? (
            <div className="panel">
              <div className="eyebrow">Current asset</div>
              <h2>{asset.asset_id}</h2>
              <p className="muted">{asset.provenance?.notes}</p>
              <div className="health-grid">
                <div className="metric">
                  <div className="metric-value">{asset.status}</div>
                  <div className="metric-label">Asset status</div>
                </div>
                <div className="metric">
                  <div className="metric-value">{asset.attempt}</div>
                  <div className="metric-label">Attempt</div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="health-column">
          <section className="panel">
            <div className="eyebrow">Project Health</div>
            <div className="health-grid">
              <div className="metric">
                <div className="metric-value">{data.health.errors}</div>
                <div className="metric-label">Contract errors</div>
              </div>
              <div className="metric">
                <div className="metric-value">{data.health.warnings}</div>
                <div className="metric-label">Warnings</div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="eyebrow">Checks</div>
            <div className="details-list">
              {data.report.checks.map((check) => (
                <div className={"detail-item " + check.status} key={check.id}>
                  <div className="detail-head">
                    <span>{check.status === "pass" ? "✓" : check.status === "blocked" ? "·" : "!"}</span>
                    <span>{check.stage}</span>
                  </div>
                  <p className="detail-message">{check.message}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
