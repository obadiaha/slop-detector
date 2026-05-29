import { withAuth, ok, err } from "@/lib/api";
import * as store from "@/lib/store";
import { campaignStats, targetsToCsv } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/v1/campaigns/:id/results — programmatic results as JSON or CSV.
//   ?format=csv  → text/csv download
//   (default)    → JSON { campaign, stats, targets }
export const GET = withAuth(async (req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  const targets = store.listTargets(campaign.id);
  const format = new URL(req.url).searchParams.get("format");

  if (format === "csv") {
    return new Response(targetsToCsv(targets), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${campaign.name}-results.csv"`,
      },
    });
  }

  return ok({
    campaign: { id: campaign.id, name: campaign.name, status: campaign.status },
    stats: campaignStats(campaign.id),
    targets,
  });
});
