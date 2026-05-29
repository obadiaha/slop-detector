import { withAuth, ok, err, jsonBody } from "@/lib/api";
import * as store from "@/lib/store";
import { ingestTargets, type RawTarget } from "@/lib/engine";
import { campaignStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/v1/campaigns/:id/targets — list targets (optionally ?status=sent).
export const GET = withAuth(async (req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  const status = new URL(req.url).searchParams.get("status");
  let targets = store.listTargets(campaign.id);
  if (status) targets = targets.filter((t) => t.status === status);
  return ok({ targets, count: targets.length });
});

interface AppendBody {
  targets?: Array<string | RawTarget>;
}

// POST /api/v1/campaigns/:id/targets — append more targets to a campaign.
export const POST = withAuth(async (req, auth, params) => {
  const campaign = store.getCampaign(params.id, auth.client.id);
  if (!campaign) return err(404, "Campaign not found.");
  const body = await jsonBody<AppendBody>(req);
  const raw = (body.targets ?? []).map((t) => (typeof t === "string" ? { handle: t } : t));
  if (raw.length === 0) return err(400, "Provide a non-empty 'targets' array.");
  const ingest = ingestTargets(campaign, raw);
  return ok({ ingest, stats: campaignStats(campaign.id) }, 201);
});
