import { withAuth, ok, err, jsonBody } from "@/lib/api";
import * as store from "@/lib/store";
import { processCampaign } from "@/lib/engine";
import { campaignStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface StartBody {
  /** Drain the whole queue in one call (demo). Default true for the API. */
  drain?: boolean;
  /** Cap the number of sends this invocation. */
  maxSends?: number;
}

// POST /api/v1/campaigns/:id/start — run the execution engine over the queue.
//
// In a production deployment this work is owned by a background worker; the
// endpoint exists so integrators (and the dashboard) can kick a run on demand.
export const POST = withAuth(async (req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  if (campaign.status === "paused") return err(409, "Campaign is paused. Resume it first.");

  const body = await jsonBody<StartBody>(req);
  const result = await processCampaign(campaign.id, {
    drain: body.drain ?? true,
    maxSends: body.maxSends,
  });

  return ok({ result, stats: campaignStats(campaign.id) });
});
