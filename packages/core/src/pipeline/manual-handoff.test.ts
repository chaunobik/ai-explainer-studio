import { describe, expect, it } from "vitest";
import { planManualImageActions } from "./manual-handoff";

describe("manual handoff planner", () => {
  it("blocks derived jobs until all references are approved", () => {
    const jobs = [
      {
        job_id: "job-a1",
        output_asset_id: "A1",
        reference_asset_ids: ["A0"],
        status: "requires_user_action",
        user_instructions: "create A1",
      },
      {
        job_id: "job-a2",
        output_asset_id: "A2",
        reference_asset_ids: ["A1"],
        status: "requires_user_action",
        user_instructions: "create A2",
      },
    ];

    const actions = planManualImageActions(jobs, [
      { asset_id: "A0", status: "approved" },
      { asset_id: "A1", status: "qa_pending" },
    ]);

    expect(actions[0]).toMatchObject({ assetId: "A1", ready: true });
    expect(actions[1].ready).toBe(false);
    expect(actions[1].blockers[0]).toContain("A1 must be approved");
  });
});
