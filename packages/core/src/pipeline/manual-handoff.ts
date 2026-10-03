export interface ManualProviderJobLike {
  job_id: string;
  output_asset_id: string;
  reference_asset_ids: string[];
  status: string;
  user_instructions?: string | null;
}

export interface ImageAssetLike {
  asset_id: string;
  status: string;
}

export interface ManualAction {
  jobId: string;
  assetId: string;
  ready: boolean;
  blockers: string[];
  instructions: string;
}

export function planManualImageActions(
  jobs: ManualProviderJobLike[],
  assets: ImageAssetLike[],
): ManualAction[] {
  const status = new Map(assets.map((asset) => [asset.asset_id, asset.status]));

  return jobs
    .filter((job) => job.status === "requires_user_action")
    .map((job) => {
      const blockers = job.reference_asset_ids
        .filter((assetId) => status.get(assetId) !== "approved")
        .map(
          (assetId) =>
            `${assetId} must be approved before generating ${job.output_asset_id}`,
        );

      return {
        jobId: job.job_id,
        assetId: job.output_asset_id,
        ready: blockers.length === 0,
        blockers,
        instructions:
          job.user_instructions ??
          "Run the provider job manually and import the result.",
      };
    });
}
