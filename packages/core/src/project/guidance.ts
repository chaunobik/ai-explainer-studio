
import type {ProjectReadinessReport, ReadinessCheck} from "./readiness";

export type GuidedActionKind =
  | "multiview_prompt_qa"
  | "generate_reference_pack"
  | "multiview_qa"
  | "upload_image"
  | "review_image"
  | "prompt_qa"
  | "generate_image"
  | "repair_image"
  | "upload_voice"
  | "review_voice"
  | "motion_qa"
  | "render_project"
  | "final_qa"
  | "human_review"
  | "blocked"
  | "complete"
  | "generic";

export interface GuidedActionContext {
  promptIdByAsset?: Record<string, string>;
  referencePromptIdByAsset?: Record<string, string>;
  referencePackAssetIds?: string[];
}

export interface GuidedNextAction {
  id: string;
  kind: GuidedActionKind;
  stage: string;
  title: string;
  reason: string;
  asset_id?: string;
  prompt_id?: string;
  instructions: string[];
  required_inputs: string[];
  completion_criteria: string[];
  primary_action: {
    type:
      | "open_multiview_prompt_qa"
      | "open_reference_generation_prompt"
      | "open_multiview_qa"
      | "upload_image"
      | "review_image"
      | "open_prompt_qa"
      | "open_generation_prompt"
      | "upload_voice"
      | "review_voice"
      | "open_motion_qa"
      | "render_project"
      | "open_final_qa"
      | "open_review"
      | "none";
    label: string;
  };
}

function assetIdFromCheck(check: ReadinessCheck): string | undefined {
  if (check.id.startsWith("image-reference:")) {
    return check.id.slice("image-reference:".length);
  }
  if (check.id.startsWith("image:")) {
    return check.id.slice("image:".length);
  }
  if (check.id.startsWith("voice:")) {
    return check.id.slice("voice:".length);
  }
  if (check.id.startsWith("prompt-qa:")) {
    return check.id.slice("prompt-qa:".length);
  }
  return undefined;
}

function imageAction(
  check: ReadinessCheck,
  promptCheck: ReadinessCheck | undefined,
  context: GuidedActionContext,
): GuidedNextAction | null {
  const assetId = assetIdFromCheck(check);
  if (!assetId) return null;

  if (
    !check.id.startsWith("image-reference:") &&
    promptCheck &&
    promptCheck.status !== "pass" &&
    check.status !== "blocked"
  ) {
    const promptId = context.promptIdByAsset?.[assetId];
    const failed = promptCheck.message.toLowerCase().includes("failed");
    return {
      id: `guided:prompt-qa:${assetId}`,
      kind: "prompt_qa",
      stage: "image_prompt",
      title: failed ? `Sửa prompt của ${assetId}` : `Kiểm tra prompt của ${assetId}`,
      reason: failed
        ? `Prompt QA của ${assetId} đã FAIL. Sửa đúng các lỗi được nêu rồi chạy QA lại.`
        : `${assetId} chưa được phép tạo ảnh cho đến khi Image Prompt QA đạt PASS.`,
      asset_id: assetId,
      prompt_id: promptId,
      instructions: failed
        ? [
            "Đọc Critical issues và Repair actions.",
            "Sửa ImagePromptSpec trực tiếp hoặc dùng Copy Repair Package để nhờ ChatGPT sửa đúng contract.",
            "Lưu prompt đã sửa; tool sẽ xóa QA FAIL cũ và yêu cầu chạy Prompt QA lại.",
          ]
        : [
            `Mở prompt chi tiết của ${assetId}.`,
            "Dùng Image Prompt QA trong ChatGPT để kiểm tra camera, continuity và tính đúng kỹ thuật.",
            "Dán kết quả QA JSON trở lại giao diện.",
          ],
      required_inputs: failed
        ? ["ImagePromptSpec hiện tại", "Repair actions từ QA"]
        : ["ImagePromptSpec", "Prompt QA JSON từ ChatGPT"],
      completion_criteria: failed
        ? ["Prompt sửa đúng schema và giữ nguyên các ID.", "Prompt QA mới đạt PASS."]
        : [
            `Prompt QA của ${assetId} có đúng prompt_id${promptId ? ` = ${promptId}` : ""}.`,
            "QA status = pass.",
          ],
      primary_action: {
        type: "open_prompt_qa",
        label: failed ? `Repair prompt ${assetId}` : `Review prompt ${assetId}`,
      },
    };
  }

  if (check.status === "pass" || check.status === "blocked") return null;

  const message = check.message.toLowerCase();

  if (
    message.includes("waiting for an imported file") ||
    message.includes("no imported asset record") ||
    message.includes("waiting for an imported")
  ) {
    return {
      id: `guided:upload-image:${assetId}`,
      kind: "upload_image",
      stage: "visual_assets",
      title:
        assetId === "A0"
          ? "Nhập ảnh tham chiếu A0"
          : `Nhập ảnh đã tạo cho ${assetId}`,
      reason:
        assetId === "A0"
          ? "A0 là ảnh gốc dùng để khóa danh tính của vật thể trước khi tạo các scene sau."
          : `${assetId} đã sẵn sàng nhận file ảnh thực tế để tiếp tục Visual QA.`,
      asset_id: assetId,
      instructions: [
        "Chọn đúng file ảnh trên máy.",
        "Tool sẽ tự copy file, tính checksum và chuyển trạng thái sang QA Pending.",
        "Sau khi import, giao diện sẽ tự chuyển sang bước review.",
      ],
      required_inputs: ["File ảnh PNG/JPG/WEBP"],
      completion_criteria: [
        `${assetId} có file hợp lệ trong project.`,
        `${assetId} có trạng thái qa_pending.`,
      ],
      primary_action: {type: "upload_image", label: `Chọn ảnh ${assetId}`},
    };
  }

  if (message.includes("waiting for visual qa") || message.includes("qa_pending")) {
    return {
      id: `guided:review-image:${assetId}`,
      kind: "review_image",
      stage: "visual_assets",
      title: `Visual QA cho ${assetId}`,
      reason: `${assetId} đã được import nhưng chưa được phép làm đầu vào cho bước sau.`,
      asset_id: assetId,
      instructions: [
        "Xem ảnh ở kích thước đủ lớn.",
        "Đối chiếu identity, geometry, camera, continuity và yêu cầu kỹ thuật.",
        "Approve nếu đạt; nếu không, Reject và chỉ sửa đúng asset này.",
      ],
      required_inputs: ["Ảnh đã import", "Kết quả review/QA"],
      completion_criteria: [`${assetId} có trạng thái approved hoặc rejected có repair action.`],
      primary_action: {type: "review_image", label: `Review ${assetId}`},
    };
  }

  if (message.includes("failed qa") || message.includes("local repair")) {
    return {
      id: `guided:repair-image:${assetId}`,
      kind: "repair_image",
      stage: "visual_assets",
      title: `Sửa riêng ${assetId}`,
      reason: `${assetId} không đạt QA; các asset đã PASS không cần làm lại.`,
      asset_id: assetId,
      instructions: [
        "Đọc repair actions của lần QA gần nhất.",
        "Giữ nguyên approved parent/reference.",
        `Regenerate duy nhất ${assetId}, sau đó import và QA lại.`,
      ],
      required_inputs: ["Repair actions", "Approved reference asset"],
      completion_criteria: [`${assetId} được tạo lại và quay về qa_pending.`],
      primary_action: {type: "open_generation_prompt", label: `Repair ${assetId}`},
    };
  }

  if (check.status === "ready") {
    return {
      id: `guided:generate-image:${assetId}`,
      kind: "generate_image",
      stage: "visual_assets",
      title: `Tạo ảnh ${assetId}`,
      reason: `Dependencies của ${assetId} đã sẵn sàng và Prompt QA đã PASS.`,
      asset_id: assetId,
      prompt_id: context.promptIdByAsset?.[assetId],
      instructions: [
        "Mở detailed ImagePromptSpec.",
        "Dùng đúng approved reference asset được chỉ định.",
        "Tạo/edit ảnh trong ChatGPT Image rồi import kết quả trở lại tool.",
      ],
      required_inputs: ["Approved reference asset", "Detailed ImagePromptSpec"],
      completion_criteria: [`Ảnh ${assetId} được import và chuyển sang qa_pending.`],
      primary_action: {type: "open_generation_prompt", label: `Tạo ${assetId}`},
    };
  }

  return null;
}

export function deriveGuidedNextAction(
  report: ProjectReadinessReport,
  context: GuidedActionContext = {},
): GuidedNextAction {
  if (report.overall_status === "complete") {
    return {
      id: "guided:complete",
      kind: "complete",
      stage: "final",
      title: "Project đã hoàn tất",
      reason: "Tất cả gate quan trọng và Final Video QA đều đã PASS.",
      instructions: ["Xem lại final.mp4 và chuẩn bị publish/export."],
      required_inputs: [],
      completion_criteria: ["Không còn action bắt buộc."],
      primary_action: {type: "none", label: "Hoàn tất"},
    };
  }

  const human = report.checks.find(
    (check) => check.status === "needs_human_review",
  );
  if (human) {
    return {
      id: `guided:human:${human.id}`,
      kind: "human_review",
      stage: human.stage,
      title: "Cần human review",
      reason: human.message,
      instructions: [human.action ?? "Review artifact trước khi tiếp tục."],
      required_inputs: ["Human review"],
      completion_criteria: ["Issue được xác nhận hoặc sửa và QA lại."],
      primary_action: {type: "open_review", label: "Mở review"},
    };
  }

  const referencePackIds = context.referencePackAssetIds ?? [];
  for (const assetId of referencePackIds) {
    const promptCheck = report.checks.find(
      (check) => check.id === `multiview-prompt-qa:${assetId}`,
    );
    const imageCheck = report.checks.find(
      (check) => check.id === `image:${assetId}`,
    );
    const qaCheck = report.checks.find(
      (check) => check.id === `multiview-qa:${assetId}`,
    );
    const promptId = context.referencePromptIdByAsset?.[assetId];

    if (promptCheck && promptCheck.status !== "pass") {
      return {
        id: `guided:multiview-prompt-qa:${assetId}`,
        kind: "multiview_prompt_qa",
        stage: "image_prompt",
        title: `Kiểm tra prompt bộ tham chiếu ${assetId}`,
        reason:
          "A0 sẽ trở thành nguồn hình học chuẩn cho toàn bộ video, nên prompt đa góc phải PASS trước khi tạo ảnh.",
        asset_id: assetId,
        prompt_id: promptId,
        instructions: [
          "Xem Subject Identity Lock, danh sách góc chụp và thông số camera/điện thoại.",
          "Copy Multi-View Prompt QA Package sang ChatGPT.",
          "Dán JSON QA trở lại tool; chỉ tiếp tục khi status = pass.",
        ],
        required_inputs: [
          "MultiViewReferencePromptSpec",
          "PhotoCaptureSpec",
          "Multi-View Prompt QA JSON",
        ],
        completion_criteria: [
          `Prompt QA của ${assetId} có đúng prompt_id${promptId ? ` = ${promptId}` : ""}.`,
          "QA status = pass.",
        ],
        primary_action: {
          type: "open_multiview_prompt_qa",
          label: "Review A0 Multi-View Prompt",
        },
      };
    }

    if (imageCheck && imageCheck.status !== "pass") {
      const lower = imageCheck.message.toLowerCase();

      if (
        imageCheck.status === "ready" &&
        (lower.includes("ready for generation") ||
          lower.includes("no imported asset record") ||
          lower.includes("failed qa"))
      ) {
        return {
          id: `guided:generate-reference-pack:${assetId}`,
          kind: "generate_reference_pack",
          stage: "visual_assets",
          title:
            lower.includes("failed qa")
              ? "Sửa và tạo lại A0 Reference Pack"
              : "Tạo A0 Multi-View Reference Pack",
          reason:
            lower.includes("failed qa")
              ? "A0 không đạt Multi-View QA. Chỉ sửa A0 theo repair actions rồi tạo lại."
              : "Prompt A0 đã PASS. Bây giờ tạo một ảnh reference board đa góc bằng AI; không cần ảnh thật.",
          asset_id: assetId,
          prompt_id: promptId,
          instructions: [
            "Copy exact A0 generation prompt.",
            "Tạo đúng MỘT reference board với mọi góc bắt buộc và cùng một sản phẩm.",
            "Không upload ảnh thật làm reference.",
            "Upload ảnh A0 sinh bởi AI trở lại tool.",
          ],
          required_inputs: [
            "Approved Multi-View Reference Prompt",
            "ChatGPT Image",
          ],
          completion_criteria: [
            `${assetId} reference board được import vào project.`,
            `${assetId} chuyển sang qa_pending.`,
          ],
          primary_action: {
            type: "open_reference_generation_prompt",
            label: "Generate A0 Reference Pack",
          },
        };
      }

      if (
        imageCheck.status === "action_required" &&
        (lower.includes("visual qa") || lower.includes("qa_pending"))
      ) {
        return {
          id: `guided:multiview-qa:${assetId}`,
          kind: "multiview_qa",
          stage: "visual_assets",
          title: "Multi-View Consistency QA cho A0",
          reason:
            "A0 đã được tạo nhưng chưa được phép làm visual source of truth cho các scene sau.",
          asset_id: assetId,
          prompt_id: promptId,
          instructions: [
            "Xem toàn bộ board ở kích thước lớn.",
            "Kiểm tra cùng một sản phẩm ở mọi góc, geometry, vật liệu, camera và độ chân thực.",
            "Copy Multi-View QA Package sang ChatGPT cùng ảnh A0.",
            "Dán QA JSON trở lại tool.",
          ],
          required_inputs: ["A0 reference board", "Multi-View QA JSON"],
          completion_criteria: [
            "Multi-View QA = pass.",
            "A0 được tự động chuyển sang approved.",
          ],
          primary_action: {
            type: "open_multiview_qa",
            label: "Review A0 Multi-View",
          },
        };
      }
    }

    if (qaCheck && qaCheck.status === "needs_human_review") {
      return {
        id: `guided:multiview-human:${assetId}`,
        kind: "human_review",
        stage: "visual_assets",
        title: "A0 cần human review",
        reason: qaCheck.message,
        asset_id: assetId,
        prompt_id: promptId,
        instructions: [qaCheck.action ?? "Review A0 trước khi tiếp tục."],
        required_inputs: ["A0", "Human review"],
        completion_criteria: ["A0 được xác nhận hoặc sửa và QA lại."],
        primary_action: {type: "open_review", label: "Review A0"},
      };
    }
  }

  const imageChecks = report.checks.filter(
    (check) =>
      check.id.startsWith("image-reference:") || check.id.startsWith("image:"),
  );

  for (const imageCheck of imageChecks) {
    const assetId = assetIdFromCheck(imageCheck);
    if (!assetId) continue;
    const promptCheck = report.checks.find(
      (check) => check.id === `prompt-qa:${assetId}`,
    );
    const action = imageAction(imageCheck, promptCheck, context);
    if (action) return action;
  }

  const voiceChecks = report.checks.filter((check) =>
    check.id.startsWith("voice:"),
  );
  for (const check of voiceChecks) {
    if (check.status === "pass" || check.status === "blocked") continue;
    const assetId = assetIdFromCheck(check);
    if (!assetId) continue;
    const isQa = check.message.toLowerCase().includes("voice qa");
    return {
      id: `guided:voice:${assetId}`,
      kind: isQa ? "review_voice" : "upload_voice",
      stage: "voice",
      title: isQa ? `Voice QA cho ${assetId}` : `Tạo/import ${assetId}`,
      reason: check.message,
      asset_id: assetId,
      instructions: isQa
        ? [
            "Nghe toàn bộ clip.",
            "Kiểm tra đúng narration, phát âm và timing.",
            "Approve hoặc reject clip này.",
          ]
        : [
            "Tạo voice đúng nội dung VoiceSpec.",
            "Import file audio vào tool.",
            "Tool sẽ chuyển sang Voice QA.",
          ],
      required_inputs: isQa ? ["Audio clip", "Voice QA"] : ["Audio file"],
      completion_criteria: [
        isQa
          ? `${assetId} được approved hoặc rejected.`
          : `${assetId} được import và chuyển sang qa_pending.`,
      ],
      primary_action: {
        type: isQa ? "review_voice" : "upload_voice",
        label: isQa ? `Review ${assetId}` : `Import ${assetId}`,
      },
    };
  }

  const motionQa = report.checks.find((check) => check.id === "motion-qa");
  if (motionQa && motionQa.status === "action_required") {
    return {
      id: "guided:motion-qa",
      kind: "motion_qa",
      stage: "motion",
      title: "Render preview và chạy Motion QA",
      reason: motionQa.message,
      instructions: [
        "Render các scene cần kiểm tra.",
        "Kiểm tra timing, arrows, labels, subtitle và continuity.",
        "Lưu Motion QA result PASS trước final render.",
      ],
      required_inputs: ["Scene previews", "Motion QA result"],
      completion_criteria: ["Motion QA status = pass."],
      primary_action: {type: "open_motion_qa", label: "Mở Motion QA"},
    };
  }

  if (report.overall_status === "render_ready") {
    return {
      id: "guided:render",
      kind: "render_project",
      stage: "final",
      title: "Render video hoàn chỉnh",
      reason: "Tất cả gate trước render đã PASS.",
      instructions: [
        "Bắt đầu final render.",
        "Chờ render hoàn tất.",
        "Sau đó tool sẽ tự chuyển sang Final Video QA.",
      ],
      required_inputs: [],
      completion_criteria: ["final.mp4 được tạo thành công."],
      primary_action: {type: "render_project", label: "Render Final Video"},
    };
  }

  if (report.overall_status === "final_qa_required") {
    return {
      id: "guided:final-qa",
      kind: "final_qa",
      stage: "final",
      title: "Final Video QA",
      reason: "Video đã render nhưng chưa được phép coi là hoàn tất.",
      instructions: [
        "Xem toàn bộ final.mp4.",
        "Kiểm tra hình, voice, subtitle, timing và lỗi kỹ thuật.",
        "Lưu Final QA result.",
      ],
      required_inputs: ["final.mp4", "Final QA result"],
      completion_criteria: ["Final QA = pass."],
      primary_action: {type: "open_final_qa", label: "Review Final Video"},
    };
  }

  const first = report.checks.find(
    (check) =>
      check.status === "ready" ||
      check.status === "action_required" ||
      check.status === "blocked",
  );

  return {
    id: `guided:generic:${first?.id ?? "blocked"}`,
    kind: first?.status === "blocked" ? "blocked" : "generic",
    stage: first?.stage ?? "pipeline",
    title: first?.status === "blocked" ? "Pipeline đang bị chặn" : "Bước tiếp theo",
    reason: first?.message ?? "Không tìm thấy action tự động phù hợp.",
    instructions: [first?.action ?? "Chạy project doctor để xem chi tiết."],
    required_inputs: [],
    completion_criteria: ["Giải quyết check hiện tại và refresh readiness."],
    primary_action: {type: "none", label: "Xem chi tiết"},
  };
}
