import Link from "next/link";
import {CopyButton} from "../../../components/CopyButton";
import {loadProjectDashboard} from "../../../lib/project-runtime";
import {
  buildImagePromptSpecContractAppendix,
  buildQaContractAppendix,
} from "../../../lib/qa-contract";
import {
  renderFinalAction,
  renderScenePreviewAction,
  saveFinalQaAction,
  saveMotionQaAction,
  saveMultiviewPromptQaAction,
  saveMultiviewQaAction,
  savePromptQaAction,
  saveRepairedPromptAction,
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

function humanizeCheckName(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function QaReviewPanel({title, qa}: {title: string; qa: any}) {
  if (!qa) return null;
  const status = qa.status ?? qa.qa_result?.status ?? "unknown";
  const checks = qa.checks ?? {};
  const notes = qa.check_notes ?? {};
  const attentionChecks = Object.entries(checks).filter(([, value]) => value !== "pass");
  const passedChecks = Object.entries(checks).filter(([, value]) => value === "pass");
  const critical = qa.critical_issues ?? qa.critical_violations ?? [];
  const repairs = qa.repair_actions ?? [];

  if (status === "pass") {
    return (
      <details className="panel compact-details">
        <summary>
          <strong>{title}</strong> <span className="mini-pass">PASS</span>
        </summary>
        {qa.summary ? <p className="small muted">{qa.summary}</p> : null}
        <div className="details-list">
          {passedChecks.map(([key]) => (
            <div className="detail-item pass" key={key}>
              <div className="detail-head"><span>✓</span><span>{humanizeCheckName(key)}</span></div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="panel qa-attention">
      <div className="next-title-row">
        <div>
          <div className="eyebrow">QA cần xử lý</div>
          <h2>{title}</h2>
        </div>
        <span className={"status-pill " + (status === "needs_human_review" ? "review" : "blocked")}>
          {String(status).replaceAll("_", " ")}
        </span>
      </div>

      {qa.summary ? <p className="next-reason">{qa.summary}</p> : null}

      {critical.length > 0 ? (
        <div className="repair-section">
          <h3>Critical issues</h3>
          <ul className="check-list">
            {critical.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      {repairs.length > 0 ? (
        <div className="repair-section">
          <h3>Repair actions</h3>
          <ol className="instruction-list">
            {repairs.map((item: string) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      ) : null}

      {attentionChecks.length > 0 ? (
        <div className="details-list">
          {attentionChecks.map(([key, value]) => (
            <div className={"detail-item " + (value === "needs_review" ? "needs_human_review" : "blocked")} key={key}>
              <div className="detail-head">
                <span>{value === "needs_review" ? "?" : "!"}</span>
                <span>{humanizeCheckName(key)}</span>
              </div>
              {notes[key] ? <p className="detail-message">{notes[key]}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {passedChecks.length > 0 ? (
        <details className="compact-details">
          <summary className="small">Xem {passedChecks.length} checks đã PASS</summary>
          <div className="details-list">
            {passedChecks.map(([key]) => (
              <div className="detail-item pass" key={key}>
                <div className="detail-head"><span>✓</span><span>{humanizeCheckName(key)}</span></div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
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

  const activePromptQa = prompt ? data.promptQaById[prompt.prompt_id] : undefined;
  const a0Asset = data.imageManifest.assets.find((value: any) => value.asset_id === "A0");
  const a0IsManual = a0Asset?.provenance?.provider_mode === "manual";
  const latestQa =
    activePromptQa ??
    (!a0IsManual ? data.multiviewQa : null) ??
    data.multiviewPromptQa ??
    null;
  const latestQaTitle = activePromptQa
    ? "Image Prompt QA — " + prompt.prompt_id
    : data.multiviewQa
      ? "A0 Multi-View Consistency QA"
      : data.multiviewPromptQa
        ? "A0 Multi-View Prompt QA"
        : "";

  const promptQaFailed =
    Boolean(prompt && activePromptQa && activePromptQa.status !== "pass");

  const qaPackage =
    data.guided.kind === "prompt_qa" && prompt
      ? data.promptQaTemplate +
        buildQaContractAppendix("image_prompt_qa") +
        "\n\n--- INPUT ImagePromptSpec ---\n" +
        JSON.stringify(prompt, null, 2)
      : "";

  const promptRepairPackage =
    prompt && promptQaFailed
      ? [
          "TASK: Repair the provided ImagePromptSpec using the QA failure below.",
          "Apply the SMALLEST changes needed to resolve the failure.",
          "Preserve prompt_id, asset_id, scene_id, project_id and operation exactly.",
          "Keep already-correct constraints unchanged.",
          "Update BOTH structured fields and final_prompt so they say the same thing.",
          "Return ONLY the complete corrected ImagePromptSpec JSON.",
          "",
          "--- FAILED QA RESULT ---",
          JSON.stringify(activePromptQa, null, 2),
          "",
          "--- CURRENT ImagePromptSpec ---",
          JSON.stringify(prompt, null, 2),
          buildImagePromptSpecContractAppendix(),
        ].join("\n")
      : "";

  const multiviewPromptQaPackage =
    data.multiviewPromptQaTemplate +
    buildQaContractAppendix("multiview_prompt_qa") +
    "\n\n--- INPUT MultiViewReferencePromptSpec ---\n" +
    JSON.stringify(data.multiviewReferencePrompt, null, 2);

  const multiviewQaPackage =
    data.multiviewQaTemplate +
    buildQaContractAppendix("multiview_qa") +
    "\n\n--- APPROVED/REVIEWED A0 PROMPT SPEC ---\n" +
    JSON.stringify(data.multiviewReferencePrompt, null, 2);

  const motionQaPackage =
    data.motionQaTemplate +
    buildQaContractAppendix("motion_qa") +
    "\n\n--- MOTION SPEC ---\n" +
    JSON.stringify(data.motionSpec, null, 2) +
    "\n\n--- STORYBOARD ---\n" +
    JSON.stringify(data.storyboard, null, 2);

  const finalQaPackage =
    data.finalQaTemplate +
    buildQaContractAppendix("final_qa") +
    "\n\nProject: " +
    data.manifest.topic +
    "\nExpected output: 1080x1920 vertical explainer video.";

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
              {data.guided.kind === "multiview_prompt_qa" ? (
                <div>
                  <div className="action-box">
                    <div className="eyebrow">Photo Capture Profile</div>
                    <p>
                      <strong>{data.multiviewReferencePrompt.capture_profile.capture_mode}</strong>
                      {" · "}
                      {data.multiviewReferencePrompt.capture_profile.device_class}
                    </p>
                    <p className="small muted">
                      {data.multiviewReferencePrompt.capture_profile.lens_equivalent_mm} mm eq ·
                      {" f/"}{data.multiviewReferencePrompt.capture_profile.aperture_f} ·
                      {" "}{data.multiviewReferencePrompt.capture_profile.shutter_speed} ·
                      {" ISO "}{data.multiviewReferencePrompt.capture_profile.iso} ·
                      {" WB "}{data.multiviewReferencePrompt.capture_profile.white_balance_kelvin}K
                    </p>
                  </div>
                  <div className="button-row">
                    <CopyButton
                      text={multiviewPromptQaPackage}
                      label="Copy A0 Prompt QA Package"
                    />
                  </div>
                  <details open>
                    <summary className="small"><strong>Xem A0 Multi-View Prompt</strong></summary>
                    <pre className="prompt-box">{data.multiviewReferencePrompt.final_prompt}</pre>
                  </details>
                  <form action={saveMultiviewPromptQaAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <div className="form-row">
                      <label htmlFor="mv-prompt-qa-json">Dán Multi-View Prompt QA JSON từ ChatGPT</label>
                      <textarea
                        id="mv-prompt-qa-json"
                        name="qaJson"
                        placeholder="Paste the complete MultiViewPromptQAOutput JSON returned by ChatGPT"
                        required
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">
                        Lưu A0 Prompt QA & tiếp tục
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "generate_reference_pack" ? (
                <div>
                  <div className="action-box">
                    <div className="eyebrow">A0 required views</div>
                    <div className="view-chip-grid">
                      {data.multiviewReferencePrompt.required_views.map((view: any) => (
                        <span className="view-chip" key={view.view_id}>
                          {view.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="muted">
                    Không dùng ảnh thật. Copy prompt dưới đây sang ChatGPT Image để tạo một reference board đa góc của cùng một sản phẩm.
                  </p>
                  <p className="notice">
                    Manual workflow: hãy review ảnh ngay trong ChatGPT trước khi tải về. Khi bạn upload ảnh vào tool, thao tác upload được xem là xác nhận rằng ảnh đã được bạn chấp nhận; tool sẽ không hỏi review lại.
                  </p>
                  <div className="button-row">
                    <CopyButton
                      text={data.multiviewReferencePrompt.final_prompt}
                      label="Copy A0 Generation Prompt"
                    />
                  </div>
                  <pre className="prompt-box">{data.multiviewReferencePrompt.final_prompt}</pre>
                  <form action={uploadImageAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <input type="hidden" name="assetId" value="A0" />
                    <div className="form-row">
                      <label htmlFor="a0-generated-file">
                        Sau khi GPT tạo xong và bạn đã review A0 reference board, upload ảnh tại đây
                      </label>
                      <input
                        id="a0-generated-file"
                        name="file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        required
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">
                        Upload A0 đã review & tiếp tục
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "multiview_qa" ? (
                <div>
                  <img
                    className="asset-preview reference-board-preview"
                    src={"/api/projects/" + params.slug + "/assets/A0"}
                    alt="A0 multi-view reference board"
                  />
                  <div className="action-box">
                    <div className="eyebrow">Kiểm tra bắt buộc</div>
                    <ul className="check-list">
                      <li>Cùng đúng một sản phẩm ở mọi góc.</li>
                      <li>Door/handle/divider/proportions không drift.</li>
                      <li>Đủ tất cả góc bắt buộc và không gắn nhãn sai.</li>
                      <li>Perspective phù hợp capture profile.</li>
                      <li>Ảnh giống chụp thật, không CGI/warped geometry.</li>
                      <li>Không bịa cấu tạo kỹ thuật ẩn.</li>
                    </ul>
                  </div>
                  <div className="button-row">
                    <CopyButton text={multiviewQaPackage} label="Copy Multi-View QA Package" />
                  </div>
                  <p className="small muted">
                    Upload chính ảnh A0 phía trên vào ChatGPT cùng QA Package, sau đó dán JSON kết quả bên dưới.
                  </p>
                  <form action={saveMultiviewQaAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <div className="form-row">
                      <label htmlFor="mv-qa-json">Dán Multi-View QA JSON</label>
                      <textarea
                        id="mv-qa-json"
                        name="qaJson"
                        placeholder='{"qa_result":{"qa_id":"QA-MV-A0-001","stage":"visual","status":"pass",...},"reference_prompt_id":"MVP1","asset_id":"A0",...}'
                        required
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">
                        Lưu Multi-View QA & tiếp tục
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

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
                  {promptQaFailed ? (
                    <div className="prompt-repair-flow">
                      <div className="repair-hero">
                        <div>
                          <div className="eyebrow">Prompt QA failed</div>
                          <h3>Sửa {prompt.prompt_id} ngay tại đây</h3>
                          <p className="muted">
                            Chỉ sửa các lỗi QA nêu ra. Không cần đọc lại toàn bộ các check đã PASS.
                          </p>
                        </div>
                      </div>

                      {(activePromptQa?.critical_issues?.length ?? 0) > 0 ? (
                        <div className="repair-section">
                          <strong>Lỗi cần sửa</strong>
                          <ul className="check-list">
                            {activePromptQa.critical_issues.map((item: string) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                      ) : null}

                      {(activePromptQa?.repair_actions?.length ?? 0) > 0 ? (
                        <div className="repair-section">
                          <strong>Cách sửa đề xuất</strong>
                          <ol className="instruction-list">
                            {activePromptQa.repair_actions.map((item: string) => <li key={item}>{item}</li>)}
                          </ol>
                        </div>
                      ) : null}

                      <div className="button-row">
                        <CopyButton text={promptRepairPackage} label="Copy Repair Package" />
                      </div>
                      <p className="small muted">
                        Có thể tự sửa JSON bên dưới, hoặc paste Repair Package vào ChatGPT rồi copy toàn bộ ImagePromptSpec đã sửa trở lại editor.
                      </p>

                      <form action={saveRepairedPromptAction}>
                        <input type="hidden" name="slug" value={params.slug} />
                        <input type="hidden" name="assetId" value={prompt.asset_id} />
                        <div className="form-row">
                          <label htmlFor="prompt-repair-json">ImagePromptSpec đã sửa</label>
                          <textarea
                            id="prompt-repair-json"
                            className="code-editor"
                            name="promptJson"
                            defaultValue={JSON.stringify(prompt, null, 2)}
                            spellCheck={false}
                            required
                          />
                        </div>
                        <div className="button-row">
                          <button className="button" type="submit">
                            Lưu prompt sửa & quay lại QA
                          </button>
                        </div>
                      </form>

                      <details className="compact-details">
                        <summary className="small">Advanced: xem prompt text hiện tại</summary>
                        <pre className="prompt-box">{prompt.final_prompt}</pre>
                      </details>
                    </div>
                  ) : (
                    <div>
                      <div className="button-row">
                        <CopyButton text={qaPackage} label="Copy Prompt QA Package" />
                      </div>
                      <form action={savePromptQaAction}>
                        <input type="hidden" name="slug" value={params.slug} />
                        <input type="hidden" name="assetId" value={prompt.asset_id} />
                        <div className="form-row">
                          <label htmlFor="qa-json">Dán QA JSON từ ChatGPT</label>
                          <textarea
                            id="qa-json"
                            name="qaJson"
                            placeholder="Paste the complete ImagePromptQAOutput JSON returned by ChatGPT"
                            required
                          />
                        </div>
                        <div className="button-row">
                          <button className="button" type="submit">Lưu Prompt QA & tiếp tục</button>
                        </div>
                      </form>
                      <details className="compact-details">
                        <summary className="small">Advanced: xem detailed prompt {prompt.prompt_id}</summary>
                        <pre className="prompt-box">{prompt.final_prompt}</pre>
                      </details>
                    </div>
                  )}
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
                      <label htmlFor="generated-file">Sau khi tạo và review ảnh trong ChatGPT, upload {assetId} tại đây</label>
                      <input id="generated-file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">Upload {assetId} đã review & tiếp tục</button>
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


              {data.guided.kind === "motion_qa" ? (
                <div>
                  <div className="button-row">
                    <CopyButton text={motionQaPackage} label="Copy Motion QA Package" />
                  </div>
                  <p className="small muted">
                    Render từng scene cần kiểm tra. Sau đó xem preview và upload video preview vào ChatGPT cùng Motion QA Package.
                  </p>
                  <div className="scene-preview-grid">
                    {data.storyboard.scenes.map((scene: any) => {
                      const rendered = data.previewSceneIds.includes(scene.scene_id);
                      return (
                        <div className="scene-preview-card" key={scene.scene_id}>
                          <div className="scene-preview-head">
                            <strong>{scene.scene_id}</strong>
                            <span className={rendered ? "mini-pass" : "mini-wait"}>
                              {rendered ? "Rendered" : "Not rendered"}
                            </span>
                          </div>
                          <p className="small muted">{scene.narration}</p>
                          {rendered ? (
                            <video
                              className="video-preview small-video"
                              controls
                              src={"/api/projects/" + params.slug + "/previews/" + scene.scene_id}
                            />
                          ) : null}
                          <form action={renderScenePreviewAction}>
                            <input type="hidden" name="slug" value={params.slug} />
                            <input type="hidden" name="sceneId" value={scene.scene_id} />
                            <button className="button secondary" type="submit">
                              {rendered ? "Render lại " + scene.scene_id : "Render " + scene.scene_id}
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>

                  <form action={saveMotionQaAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <div className="form-row">
                      <label htmlFor="motion-qa-json">Dán Motion QA JSON từ ChatGPT</label>
                      <textarea
                        id="motion-qa-json"
                        name="qaJson"
                        placeholder='{"qa_result":{"stage":"motion","status":"pass",...},...}'
                        required
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">Lưu Motion QA & tiếp tục</button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "render_project" ? (
                <div>
                  <p className="muted">
                    Tất cả gate trước render đã PASS. Final render sẽ dùng đúng approved images, voice, checksum và Motion QA.
                  </p>
                  <form action={renderFinalAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <button className="button" type="submit">Render Final Video</button>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "final_qa" ? (
                <div>
                  {data.outputExists ? (
                    <video
                      className="video-preview"
                      controls
                      src={"/api/projects/" + params.slug + "/final"}
                    />
                  ) : null}
                  <div className="button-row">
                    <CopyButton text={finalQaPackage} label="Copy Final QA Package" />
                  </div>
                  <p className="small muted">
                    Xem toàn bộ video, sau đó upload final.mp4 vào ChatGPT cùng package trên để lấy Final QA JSON.
                  </p>
                  <form action={saveFinalQaAction}>
                    <input type="hidden" name="slug" value={params.slug} />
                    <div className="form-row">
                      <label htmlFor="final-qa-json">Dán Final QA JSON</label>
                      <textarea
                        id="final-qa-json"
                        name="qaJson"
                        placeholder='{"qa_result":{"stage":"final","status":"pass",...},...}'
                        required
                      />
                    </div>
                    <div className="button-row">
                      <button className="button" type="submit">Lưu Final QA</button>
                    </div>
                  </form>
                </div>
              ) : null}

              {data.guided.kind === "complete" && data.outputExists ? (
                <div>
                  <video
                    className="video-preview"
                    controls
                    src={"/api/projects/" + params.slug + "/final"}
                  />
                  <p className="notice">Project COMPLETE — Final Video QA đã PASS.</p>
                </div>
              ) : null}

              {![
                "upload_image",
                "review_image",
                "prompt_qa",
                "generate_image",
                "repair_image",
                "upload_voice",
                "review_voice",
                "motion_qa",
                "render_project",
                "final_qa",
                "complete",
              ].includes(data.guided.kind) ? (
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

          {latestQa && !promptQaFailed ? <QaReviewPanel title={latestQaTitle} qa={latestQa} /> : null}

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
            <div className="eyebrow">Cần chú ý</div>
            {data.report.checks.filter((check) => check.status !== "pass" && check.status !== "blocked").length === 0 ? (
              <p className="small muted">Không có action phụ đang chờ.</p>
            ) : (
              <div className="details-list">
                {data.report.checks
                  .filter((check) => check.status === "action_required" || check.status === "ready" || check.status === "needs_human_review")
                  .slice(0, 5)
                  .map((check) => (
                    <div className={"detail-item " + check.status} key={check.id}>
                      <div className="detail-head">
                        <span>!</span>
                        <span>{check.stage}</span>
                      </div>
                      <p className="detail-message">{check.message}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <details className="panel compact-details">
            <summary><strong>Advanced details</strong></summary>
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
            <div className="details-list advanced-checks">
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
          </details>
        </aside>
      </div>
    </main>
  );
}
