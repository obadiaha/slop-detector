import { withAuth, ok, err, jsonBody } from "@/lib/api";
import * as store from "@/lib/store";
import { checkMessageQuality } from "@/lib/compliance";
import { campaignStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/v1/campaigns/:id — full campaign status.
export const GET = withAuth(async (_req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  return ok({ campaign, stats: campaignStats(campaign.id) });
});

interface PatchBody {
  message?: string;
  status?: "running" | "paused";
  webhookUrl?: string | null;
}

// PATCH /api/v1/campaigns/:id — update message, pause/resume, or webhook URL.
export const PATCH = withAuth(async (req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  const body = await jsonBody<PatchBody>(req);

  const patch: Record<string, unknown> = {};
  if (body.message !== undefined) {
    const issues = checkMessageQuality(body.message);
    if (issues.length > 0) return err(422, "Message failed quality checks.", { issues });
    patch.message = body.message;
  }
  if (body.status === "paused" && campaign.status === "running") patch.status = "paused";
  if (body.status === "running" && campaign.status === "paused") patch.status = "running";
  if (body.webhookUrl !== undefined) patch.webhookUrl = body.webhookUrl;

  const updated = store.updateCampaign(campaign.id, patch);
  return ok({ campaign: updated, stats: campaignStats(campaign.id) });
});
