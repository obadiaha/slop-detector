import { withAuth, ok, err } from "@/lib/api";
import * as store from "@/lib/store";
import { pollCampaignReplies } from "@/lib/engine";
import { campaignStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// POST /api/v1/campaigns/:id/poll-replies — fetch new replies from the driver,
// record them, and suppress opt-outs. (A worker does this on a schedule in prod.)
export const POST = withAuth(async (_req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  const result = await pollCampaignReplies(campaign.id);
  return ok({ result, stats: campaignStats(campaign.id) });
});
