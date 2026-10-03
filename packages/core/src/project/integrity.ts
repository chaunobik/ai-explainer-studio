import type {ValidationIssue, ValidationReport} from "../pipeline/types";

type AnyRecord = Record<string, any>;

function issue(
  code: string,
  path: string,
  message: string,
  severity: "error" | "warning" = "error",
): ValidationIssue {
  return {code, path, message, severity};
}

function finish(issues: ValidationIssue[]): ValidationReport {
  return {
    ok: issues.every((value) => value.severity !== "error"),
    errors: issues.filter((value) => value.severity === "error"),
    warnings: issues.filter((value) => value.severity === "warning"),
  };
}

export function validateImageManifestIntegrity(
  manifest: AnyRecord,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const ids = assets.map((asset: AnyRecord) => asset.asset_id);
  const idSet = new Set(ids);

  if (idSet.size !== ids.length) {
    issues.push(
      issue(
        "IMAGE_MANIFEST_DUP_ID",
        "image_assets.assets",
        "Image asset IDs must be unique.",
      ),
    );
  }

  const byId = new Map(
    assets.map((asset: AnyRecord) => [asset.asset_id, asset]),
  );

  for (const [index, asset] of assets.entries()) {
    const path = `image_assets.assets[${index}]`;

    if (
      manifest?.project_id &&
      asset.project_id &&
      manifest.project_id !== asset.project_id
    ) {
      issues.push(
        issue(
          "IMAGE_PROJECT_MISMATCH",
          `${path}.project_id`,
          `Asset ${asset.asset_id} belongs to ${asset.project_id}, expected ${manifest.project_id}.`,
        ),
      );
    }

    const parents = Array.isArray(asset.parent_asset_ids)
      ? asset.parent_asset_ids
      : [];

    if (new Set(parents).size !== parents.length) {
      issues.push(
        issue(
          "IMAGE_DUP_PARENT",
          `${path}.parent_asset_ids`,
          `Asset ${asset.asset_id} contains duplicate parent IDs.`,
        ),
      );
    }

    for (const parentId of parents) {
      if (parentId === asset.asset_id) {
        issues.push(
          issue(
            "IMAGE_SELF_PARENT",
            `${path}.parent_asset_ids`,
            `Asset ${asset.asset_id} cannot depend on itself.`,
          ),
        );
      } else if (!idSet.has(parentId)) {
        issues.push(
          issue(
            "IMAGE_UNKNOWN_PARENT",
            `${path}.parent_asset_ids`,
            `Asset ${asset.asset_id} references unknown parent ${parentId}.`,
          ),
        );
      }
    }

    if (asset.status === "approved") {
      if (!asset.file?.uri) {
        issues.push(
          issue(
            "IMAGE_APPROVED_NO_URI",
            `${path}.file.uri`,
            `Approved asset ${asset.asset_id} must have a file URI.`,
          ),
        );
      }

      if (!asset.file?.checksum) {
        issues.push(
          issue(
            "IMAGE_APPROVED_NO_CHECKSUM",
            `${path}.file.checksum`,
            `Approved asset ${asset.asset_id} should have a checksum.`,
            "warning",
          ),
        );
      }

      for (const parentId of parents) {
        const parent = byId.get(parentId) as AnyRecord | undefined;
        if (parent && parent.status !== "approved") {
          issues.push(
            issue(
              "IMAGE_APPROVED_WITH_UNAPPROVED_PARENT",
              path,
              `Approved asset ${asset.asset_id} depends on ${parentId}, which is ${parent.status}.`,
            ),
          );
        }
      }
    }
  }

  return finish(issues);
}

export function validatePromptQaIntegrity(
  prompts: AnyRecord[],
  qaOutputs: AnyRecord[],
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const promptIds = prompts.map((prompt) => prompt.prompt_id);
  const qaIds = qaOutputs
    .map((qa) => qa.prompt_id)
    .filter((value): value is string => typeof value === "string");

  if (new Set(promptIds).size !== promptIds.length) {
    issues.push(
      issue(
        "PROMPT_DUP_ID",
        "image_prompt_specs",
        "ImagePromptSpec prompt IDs must be unique.",
      ),
    );
  }

  if (new Set(qaIds).size !== qaIds.length) {
    issues.push(
      issue(
        "PROMPT_QA_DUP_ID",
        "image_prompt_qa_outputs",
        "Prompt QA outputs must contain at most one result per prompt_id.",
      ),
    );
  }

  const promptSet = new Set(promptIds);
  const qaSet = new Set(qaIds);

  for (const qaId of qaSet) {
    if (!promptSet.has(qaId)) {
      issues.push(
        issue(
          "PROMPT_QA_ORPHAN",
          "image_prompt_qa_outputs",
          `Prompt QA result ${qaId} has no matching ImagePromptSpec.`,
        ),
      );
    }
  }

  for (const prompt of prompts) {
    if (!qaSet.has(prompt.prompt_id)) {
      issues.push(
        issue(
          "PROMPT_QA_MISSING",
          `image_prompt_specs.${prompt.prompt_id}`,
          `Prompt ${prompt.prompt_id} has no QA result yet.`,
          "warning",
        ),
      );
    }
  }

  return finish(issues);
}
