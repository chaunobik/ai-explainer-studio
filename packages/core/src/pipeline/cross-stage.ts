import type { ValidationIssue, ValidationReport } from "./types";

type AnyRecord = Record<string, any>;

export interface CrossStageArtifacts {
  researchResult?: AnyRecord;
  claims?: AnyRecord[];
  script?: AnyRecord;
  storyboard?: AnyRecord;
  visualPlan?: AnyRecord;
  imagePromptSpecs?: AnyRecord[];
  providerJobs?: AnyRecord[];
  executionPlan?: AnyRecord;
  imageAssets?: AnyRecord[];
}

function issue(
  code: string,
  path: string,
  message: string,
  severity: "error" | "warning" = "error",
): ValidationIssue {
  return { code, path, message, severity };
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function setEquals(a: string[], b: string[]): boolean {
  const aa = [...new Set(a)].sort();
  const bb = [...new Set(b)].sort();
  return aa.length === bb.length && aa.every((value, index) => value === bb[index]);
}

function finalize(issues: ValidationIssue[]): ValidationReport {
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  return { ok: errors.length === 0, errors, warnings };
}

export function validateCrossStageArtifacts(
  artifacts: CrossStageArtifacts,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (artifacts.researchResult && artifacts.claims) {
    const sourceIds = (artifacts.researchResult.sources ?? []).map(
      (source: AnyRecord) => source.source_id,
    );

    if (!unique(sourceIds)) {
      issues.push(issue("RESEARCH_DUP_SOURCE", "research.sources", "Source IDs must be unique."));
    }

    for (const [index, finding] of (artifacts.researchResult.findings ?? []).entries()) {
      for (const sourceId of finding.source_ids ?? []) {
        if (!sourceIds.includes(sourceId)) {
          issues.push(
            issue(
              "RESEARCH_FINDING_BAD_SOURCE",
              `research.findings[${index}].source_ids`,
              `Finding references unknown source ${sourceId}.`,
            ),
          );
        }
      }
    }

    const claimIds = artifacts.claims.map((claim) => claim.claim_id);
    if (!unique(claimIds)) {
      issues.push(issue("CLAIM_DUP_ID", "claims", "Claim IDs must be unique."));
    }

    for (const [index, claim] of artifacts.claims.entries()) {
      for (const sourceId of claim.source_ids ?? []) {
        if (!sourceIds.includes(sourceId)) {
          issues.push(
            issue(
              "CLAIM_BAD_SOURCE",
              `claims[${index}].source_ids`,
              `Claim ${claim.claim_id} references unknown source ${sourceId}.`,
            ),
          );
        }
      }

      if (claim.status === "approved" && claim.allowed_for_script !== true) {
        issues.push(
          issue(
            "CLAIM_APPROVAL_MISMATCH",
            `claims[${index}]`,
            `Approved claim ${claim.claim_id} must allow script use.`,
          ),
        );
      }

      if (claim.status !== "approved" && claim.allowed_for_script === true) {
        issues.push(
          issue(
            "CLAIM_UNSAFE_SCRIPT_USE",
            `claims[${index}]`,
            `Non-approved claim ${claim.claim_id} cannot be allowed for script use.`,
          ),
        );
      }
    }
  }

  if (artifacts.script && artifacts.claims) {
    const claimMap = new Map(
      artifacts.claims.map((claim) => [claim.claim_id, claim]),
    );

    const usedClaimIds = [
      ...(artifacts.script.hook?.claim_ids ?? []),
      ...(artifacts.script.segments ?? []).flatMap(
        (segment: AnyRecord) => segment.claim_ids ?? [],
      ),
      ...(artifacts.script.payoff?.claim_ids ?? []),
    ];

    for (const claimId of usedClaimIds) {
      const claim = claimMap.get(claimId);
      if (!claim) {
        issues.push(
          issue(
            "SCRIPT_UNKNOWN_CLAIM",
            "script",
            `Script references unknown claim ${claimId}.`,
          ),
        );
        continue;
      }

      if (claim.status !== "approved" || claim.allowed_for_script !== true) {
        issues.push(
          issue(
            "SCRIPT_UNAPPROVED_CLAIM",
            "script",
            `Script uses claim ${claimId} that is not approved for script use.`,
          ),
        );
      }
    }

    if (!setEquals(usedClaimIds, artifacts.script.approved_claim_ids ?? [])) {
      issues.push(
        issue(
          "SCRIPT_CLAIM_SET_MISMATCH",
          "script.approved_claim_ids",
          "approved_claim_ids must equal the exact set of claims used by hook, segments and payoff.",
        ),
      );
    }

    const target = Number(artifacts.script.target_duration_sec ?? 0);
    const estimated = Number(artifacts.script.estimated_duration_sec ?? 0);
    if (target > 0 && Math.abs(target - estimated) > 10) {
      issues.push(
        issue(
          "SCRIPT_DURATION_DRIFT",
          "script.estimated_duration_sec",
          `Estimated duration ${estimated}s is more than 10s away from target ${target}s.`,
          "warning",
        ),
      );
    }
  }

  if (artifacts.storyboard && artifacts.script) {
    const parts = new Map<string, string>();
    parts.set("hook", artifacts.script.hook?.spoken_text ?? "");
    for (const segment of artifacts.script.segments ?? []) {
      parts.set(segment.segment_id, segment.spoken_text);
    }
    parts.set("payoff", artifacts.script.payoff?.spoken_text ?? "");

    const expectedPartIds = [...parts.keys()];
    const seenPartIds: string[] = [];
    const sceneIds = (artifacts.storyboard.scenes ?? []).map(
      (scene: AnyRecord) => scene.scene_id,
    );

    if (!unique(sceneIds)) {
      issues.push(issue("STORYBOARD_DUP_SCENE", "storyboard.scenes", "Scene IDs must be unique."));
    }

    for (const [index, scene] of (artifacts.storyboard.scenes ?? []).entries()) {
      const ids = scene.script_part_ids ?? [];
      const missing = ids.filter((id: string) => !parts.has(id));
      if (missing.length > 0) {
        issues.push(
          issue(
            "STORYBOARD_UNKNOWN_SCRIPT_PART",
            `storyboard.scenes[${index}].script_part_ids`,
            `Unknown script part(s): ${missing.join(", ")}.`,
          ),
        );
        continue;
      }

      seenPartIds.push(...ids);
      const expectedNarration = ids.map((id: string) => parts.get(id)).join(" ");
      if (scene.narration !== expectedNarration) {
        issues.push(
          issue(
            "STORYBOARD_NARRATION_DRIFT",
            `storyboard.scenes[${index}].narration`,
            `Scene ${scene.scene_id} narration is not verbatim from its referenced script part(s).`,
          ),
        );
      }
    }

    if (!setEquals(seenPartIds, expectedPartIds)) {
      issues.push(
        issue(
          "STORYBOARD_SCRIPT_COVERAGE",
          "storyboard.scenes",
          "Storyboard must cover every script part exactly once.",
        ),
      );
    }

    const duplicates = seenPartIds.filter(
      (id, index) => seenPartIds.indexOf(id) !== index,
    );
    if (duplicates.length > 0) {
      issues.push(
        issue(
          "STORYBOARD_DUP_SCRIPT_PART",
          "storyboard.scenes",
          `Script part(s) appear more than once: ${[...new Set(duplicates)].join(", ")}.`,
        ),
      );
    }

    const sum = (artifacts.storyboard.scenes ?? []).reduce(
      (total: number, scene: AnyRecord) => total + Number(scene.duration_sec ?? 0),
      0,
    );
    if (Math.abs(sum - Number(artifacts.storyboard.total_duration_sec ?? 0)) > 0.001) {
      issues.push(
        issue(
          "STORYBOARD_DURATION_SUM",
          "storyboard.total_duration_sec",
          `Declared total ${artifacts.storyboard.total_duration_sec}s does not equal scene sum ${sum}s.`,
        ),
      );
    }

    if (
      Math.abs(
        Number(artifacts.storyboard.target_duration_sec ?? 0) -
          Number(artifacts.storyboard.total_duration_sec ?? 0),
      ) > 5
    ) {
      issues.push(
        issue(
          "STORYBOARD_TARGET_DRIFT",
          "storyboard.total_duration_sec",
          "Storyboard total duration is more than 5s away from target.",
          "warning",
        ),
      );
    }
  }

  if (artifacts.visualPlan && artifacts.storyboard) {
    const sceneIds = (artifacts.storyboard.scenes ?? []).map(
      (scene: AnyRecord) => scene.scene_id,
    );
    const routeIds = (artifacts.visualPlan.routes ?? []).map(
      (route: AnyRecord) => route.scene_id,
    );
    const lineageIds = (artifacts.visualPlan.lineage ?? []).map(
      (entry: AnyRecord) => entry.scene_id,
    );

    for (const sceneId of sceneIds) {
      if (routeIds.filter((id: string) => id === sceneId).length !== 1) {
        issues.push(
          issue(
            "VISUAL_ROUTE_COVERAGE",
            "visual_plan.routes",
            `Scene ${sceneId} must have exactly one visual route.`,
          ),
        );
      }

      if (lineageIds.filter((id: string) => id === sceneId).length !== 1) {
        issues.push(
          issue(
            "VISUAL_LINEAGE_COVERAGE",
            "visual_plan.lineage",
            `Scene ${sceneId} must have exactly one lineage record.`,
          ),
        );
      }
    }

    const assetIds = new Set(
      (artifacts.visualPlan.asset_bible?.assets ?? []).map(
        (asset: AnyRecord) => asset.asset_id,
      ),
    );

    for (const [index, route] of (artifacts.visualPlan.routes ?? []).entries()) {
      for (const assetId of [
        ...(route.input_asset_ids ?? []),
        ...(route.planned_output_asset_ids ?? []),
      ]) {
        if (!assetIds.has(assetId)) {
          issues.push(
            issue(
              "VISUAL_ROUTE_BAD_ASSET",
              `visual_plan.routes[${index}]`,
              `Route references unknown AssetBible asset ${assetId}.`,
            ),
          );
        }
      }
    }

    const expectedPairs = sceneIds.slice(0, -1).map(
      (sceneId: string, index: number) => `${sceneId}->${sceneIds[index + 1]}`,
    );
    const actualPairs = (artifacts.visualPlan.transitions ?? []).map(
      (transition: AnyRecord) =>
        `${transition.from_scene_id}->${transition.to_scene_id}`,
    );

    if (!setEquals(expectedPairs, actualPairs)) {
      issues.push(
        issue(
          "VISUAL_TRANSITION_COVERAGE",
          "visual_plan.transitions",
          "Every adjacent storyboard scene pair must have exactly one transition.",
        ),
      );
    }

    const order = new Map(sceneIds.map((id: string, index: number) => [id, index]));
    for (const [index, entry] of (artifacts.visualPlan.lineage ?? []).entries()) {
      if (entry.relationship === "anchor" && entry.parent_scene_id != null) {
        issues.push(
          issue(
            "LINEAGE_ANCHOR_PARENT",
            `visual_plan.lineage[${index}]`,
            "Anchor scene cannot have a parent scene.",
          ),
        );
      }

      if (entry.relationship !== "anchor") {
        const parentIndex = order.get(entry.parent_scene_id);
        const sceneIndex = order.get(entry.scene_id);
        if (
          parentIndex == null ||
          sceneIndex == null ||
          parentIndex >= sceneIndex
        ) {
          issues.push(
            issue(
              "LINEAGE_PARENT_ORDER",
              `visual_plan.lineage[${index}]`,
              `Scene ${entry.scene_id} must derive from an earlier valid parent scene.`,
            ),
          );
        }
      }
    }
  }

  if (artifacts.executionPlan) {
    const entries = artifacts.executionPlan.assets ?? [];
    const ids = entries.map((entry: AnyRecord) => entry.asset_id);
    if (!unique(ids)) {
      issues.push(issue("EXEC_DUP_ASSET", "execution_plan.assets", "Execution asset IDs must be unique."));
    }

    const known = new Set(ids);
    for (const [index, entry] of entries.entries()) {
      for (const dependency of entry.depends_on_approved_assets ?? []) {
        if (!known.has(dependency)) {
          issues.push(
            issue(
              "EXEC_UNKNOWN_DEPENDENCY",
              `execution_plan.assets[${index}].depends_on_approved_assets`,
              `Execution asset ${entry.asset_id} depends on unknown asset ${dependency}.`,
            ),
          );
        }
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const map = new Map(entries.map((entry: AnyRecord) => [entry.asset_id, entry]));

    const visit = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      const entry = map.get(id);
      for (const dep of entry?.depends_on_approved_assets ?? []) {
        if (visit(dep)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    for (const id of ids) {
      if (visit(id)) {
        issues.push(
          issue(
            "EXEC_DEPENDENCY_CYCLE",
            "execution_plan.assets",
            `Asset dependency graph contains a cycle involving ${id}.`,
          ),
        );
        break;
      }
    }
  }

  if (
    artifacts.executionPlan &&
    artifacts.imagePromptSpecs &&
    artifacts.providerJobs
  ) {
    const imageEntries = (artifacts.executionPlan.assets ?? []).filter(
      (entry: AnyRecord) => entry.executor === "image_provider",
    );
    const promptByAsset = new Map<string, AnyRecord[]>();
    for (const prompt of artifacts.imagePromptSpecs) {
      const list = promptByAsset.get(prompt.asset_id) ?? [];
      list.push(prompt);
      promptByAsset.set(prompt.asset_id, list);
    }

    const jobByAsset = new Map<string, AnyRecord[]>();
    for (const job of artifacts.providerJobs) {
      const list = jobByAsset.get(job.output_asset_id) ?? [];
      list.push(job);
      jobByAsset.set(job.output_asset_id, list);
    }

    for (const entry of imageEntries) {
      const prompts = promptByAsset.get(entry.asset_id) ?? [];
      if (prompts.length !== 1) {
        issues.push(
          issue(
            "PROMPT_COVERAGE",
            "image_prompt_specs",
            `Image-provider asset ${entry.asset_id} must have exactly one ImagePromptSpec.`,
          ),
        );
        continue;
      }

      const prompt = prompts[0];
      if ((prompt.final_prompt ?? "").length < 200) {
        issues.push(
          issue(
            "PROMPT_TOO_SHORT",
            `image_prompt_specs.${entry.asset_id}`,
            `ImagePromptSpec ${prompt.prompt_id} is under-specified (<200 chars).`,
          ),
        );
      }

      if (
        entry.operation === "generate_anchor" &&
        prompt.operation !== "generate_anchor"
      ) {
        issues.push(
          issue(
            "PROMPT_OPERATION_MISMATCH",
            `image_prompt_specs.${entry.asset_id}`,
            "Anchor execution entry must use generate_anchor prompt operation.",
          ),
        );
      }

      if (
        entry.operation === "derive_scene" &&
        prompt.operation !== "derive_scene"
      ) {
        issues.push(
          issue(
            "PROMPT_OPERATION_MISMATCH",
            `image_prompt_specs.${entry.asset_id}`,
            "Derived execution entry must use derive_scene prompt operation.",
          ),
        );
      }

      if (prompt.operation === "derive_scene" && (prompt.reference_asset_ids ?? []).length === 0) {
        issues.push(
          issue(
            "PROMPT_MISSING_REFERENCE",
            `image_prompt_specs.${entry.asset_id}`,
            "Derived ImagePromptSpec requires at least one reference asset.",
          ),
        );
      }

      const jobs = jobByAsset.get(entry.asset_id) ?? [];
      if (jobs.length !== 1) {
        issues.push(
          issue(
            "PROVIDER_JOB_COVERAGE",
            "provider_jobs",
            `Image-provider asset ${entry.asset_id} must have exactly one provider job.`,
          ),
        );
        continue;
      }

      const job = jobs[0];
      if (job.prompt_spec_id !== prompt.prompt_id) {
        issues.push(
          issue(
            "PROVIDER_PROMPT_ID_MISMATCH",
            `provider_jobs.${entry.asset_id}`,
            `Provider job for ${entry.asset_id} does not point to ${prompt.prompt_id}.`,
          ),
        );
      }

      if (job.prompt !== prompt.final_prompt) {
        issues.push(
          issue(
            "PROVIDER_PROMPT_DRIFT",
            `provider_jobs.${entry.asset_id}`,
            `Provider job prompt for ${entry.asset_id} differs from compiled ImagePromptSpec.`,
          ),
        );
      }

      if (!setEquals(job.reference_asset_ids ?? [], prompt.reference_asset_ids ?? [])) {
        issues.push(
          issue(
            "PROVIDER_REFERENCE_DRIFT",
            `provider_jobs.${entry.asset_id}`,
            `Provider job reference assets for ${entry.asset_id} differ from ImagePromptSpec.`,
          ),
        );
      }
    }
  }

  if (artifacts.imageAssets) {
    const ids = artifacts.imageAssets.map((asset) => asset.asset_id);
    if (!unique(ids)) {
      issues.push(issue("ASSET_DUP_ID", "image_assets", "ImageAsset IDs must be unique."));
    }

    const status = new Map(
      artifacts.imageAssets.map((asset) => [asset.asset_id, asset.status]),
    );

    for (const [index, asset] of artifacts.imageAssets.entries()) {
      if (asset.asset_role === "derived") {
        if ((asset.parent_asset_ids ?? []).length === 0) {
          issues.push(
            issue(
              "DERIVED_NO_PARENT",
              `image_assets[${index}]`,
              `Derived asset ${asset.asset_id} must list parent assets.`,
            ),
          );
        }

        for (const parentId of asset.parent_asset_ids ?? []) {
          if (status.get(parentId) !== "approved") {
            issues.push(
              issue(
                "DERIVED_PARENT_NOT_APPROVED",
                `image_assets[${index}].parent_asset_ids`,
                `Derived asset ${asset.asset_id} uses parent ${parentId} that is not approved.`,
              ),
            );
          }
        }
      }
    }
  }

  return finalize(issues);
}
