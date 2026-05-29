import { withAuth, ok, err, jsonBody } from "@/lib/api";
import * as store from "@/lib/store";
import { ingestTargets, type RawTarget } from "@/lib/engine";
import { checkMessageQuality } from "@/lib/compliance";
import { campaignStats } from "@/lib/analytics";
import type { CampaignSettings, Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = (senderIds: string[]): CampaignSettings => ({
  dailyLimit: 100,
  minSecondsBetweenSends: 60,
  maxAttempts: 3,
  senderIds,
});

interface CreateBody {
  /** Campaign name (the spec uses the field "campaign"). */
  campaign?: string;
  name?: string;
  message?: string;
  targets?: Array<string | RawTarget>;
  webhookUrl?: string | null;
  settings?: Partial<CampaignSettings>;
  followUps?: Campaign["followUps"];
}

function normalizeTargets(input: Array<string | RawTarget> = []): RawTarget[] {
  return input.map((t) => (typeof t === "string" ? { handle: t } : t));
}

// GET /api/v1/campaigns — list this client's campaigns with summary stats.
export const GET = withAuth(async (_req, auth) => {
  const campaigns = store.listCampaigns(auth.client.id).map((c) => ({
    ...c,
    stats: campaignStats(c.id),
  }));
  return ok({ campaigns });
});

// POST /api/v1/campaigns — create (or, if the name exists, append to) a campaign.
//
// Matches the bounty spec payload:
//   { "targets": [...], "message": "...", "campaign": "client_creator_outreach_may_2026" }
export const POST = withAuth(async (req, auth) => {
  const body = await jsonBody<CreateBody>(req);
  const name = (body.campaign ?? body.name ?? "").trim();
  if (!name) return err(400, "Field 'campaign' (campaign name) is required.");

  const message = body.message?.trim();

  // Resolve sender pool: explicit setting, else all healthy senders for client.
  const healthy = store
    .listSenders(auth.client.id)
    .filter((s) => s.status === "active" || s.status === "warming")
    .map((s) => s.id);
  const senderIds = body.settings?.senderIds ?? healthy;

  const existing = store.getCampaignByName(auth.client.id, name);

  if (!existing) {
    if (!message) return err(400, "Field 'message' is required to create a campaign.");
    const issues = checkMessageQuality(message);
    if (issues.length > 0) {
      return err(422, "Message failed quality checks.", { issues });
    }
    if (senderIds.length === 0) {
      return err(422, "No sender accounts available. Add a sender before creating a campaign.");
    }
    const campaign = store.createCampaign({
      clientId: auth.client.id,
      name,
      message,
      webhookUrl: body.webhookUrl ?? null,
      settings: { ...DEFAULT_SETTINGS(senderIds), ...body.settings, senderIds },
      followUps: body.followUps,
    });
    const ingest = ingestTargets(campaign, normalizeTargets(body.targets));
    return ok({ campaign, ingest, stats: campaignStats(campaign.id) }, 201);
  }

  // Idempotent append: same campaign name → add new targets (+ optional message update).
  if (message && message !== existing.message) {
    const issues = checkMessageQuality(message);
    if (issues.length > 0) return err(422, "Message failed quality checks.", { issues });
    store.updateCampaign(existing.id, { message });
  }
  const ingest = ingestTargets(existing, normalizeTargets(body.targets));
  const campaign = store.getCampaign(existing.id, auth.client.id);
  return ok({ campaign, ingest, stats: campaignStats(existing.id), reused: true });
});
