import { read, replaceAll } from "./db";
import { hashKey } from "./auth";
import type { Database, SenderAccount, Campaign, Target } from "./types";

// ---------------------------------------------------------------------------
// Seed data
//
// Idempotent: only seeds when the database is empty. Produces one demo client
// with a KNOWN dev API key (so the README curl examples work out of the box),
// a set of sender accounts at different health/warmup stages, two campaigns
// (one already run, one ready to run), templates, and a suppression entry.
// ---------------------------------------------------------------------------

/** Known dev API key — fine to publish; this is local sample data only. */
export const DEMO_API_KEY = "ir_live_demo00000000000000000000";

const today = () => new Date().toISOString().slice(0, 10);
const iso = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

function sender(
  partial: Pick<SenderAccount, "id" | "handle" | "status"> & Partial<SenderAccount>,
): SenderAccount {
  return {
    clientId: "cli_demo",
    warmupDay: 7,
    maxDailyLimit: 50,
    healthScore: 100,
    sentToday: 0,
    sentTodayDate: today(),
    lastSendAt: null,
    consecutiveFailures: 0,
    createdAt: iso(30),
    ...partial,
  };
}

function bakedTarget(
  campaignId: string,
  handle: string,
  status: Target["status"],
  extra: Partial<Target> = {},
): Target {
  return {
    id: `tgt_seed_${campaignId}_${handle}`,
    clientId: "cli_demo",
    campaignId,
    handle,
    variables: {},
    status,
    skipReason: extra.skipReason ?? null,
    senderId: extra.senderId ?? "snd_demo_1",
    renderedMessage: extra.renderedMessage ?? null,
    attempts: extra.attempts ?? (status === "skipped" ? 0 : 1),
    lastError: extra.lastError ?? null,
    queuedAt: iso(3),
    sentAt: extra.sentAt ?? (["sent", "replied"].includes(status) ? iso(2) : null),
    repliedAt: extra.repliedAt ?? (status === "replied" ? iso(1) : null),
    replyText: extra.replyText ?? null,
    ...extra,
  };
}

export function seed(): void {
  const senders: SenderAccount[] = [
    sender({ id: "snd_demo_1", handle: "acme_outreach_01", status: "active", healthScore: 98 }),
    sender({ id: "snd_demo_2", handle: "acme_outreach_02", status: "active", healthScore: 86 }),
    sender({
      id: "snd_demo_3",
      handle: "acme_outreach_03",
      status: "warming",
      warmupDay: 2,
      maxDailyLimit: 50,
      healthScore: 100,
    }),
    sender({
      id: "snd_demo_4",
      handle: "acme_outreach_04",
      status: "unhealthy",
      healthScore: 32,
      consecutiveFailures: 3,
    }),
  ];

  const ranCampaign: Campaign = {
    id: "cmp_demo_ran",
    clientId: "cli_demo",
    name: "client_creator_outreach_apr_2026",
    status: "completed",
    message: "Hey {{firstName}} — loved your content. Would you be open to an affiliate partnership?",
    followUps: [
      {
        delayHours: 48,
        message: "Hi {{firstName}}, just floating this back up — happy to share details!",
        condition: "no_reply",
      },
    ],
    settings: {
      dailyLimit: 100,
      minSecondsBetweenSends: 90,
      maxAttempts: 3,
      senderIds: ["snd_demo_1", "snd_demo_2"],
    },
    webhookUrl: null,
    createdAt: iso(5),
    startedAt: iso(4),
    completedAt: iso(1),
  };

  const draftCampaign: Campaign = {
    id: "cmp_demo_draft",
    clientId: "cli_demo",
    name: "client_creator_outreach_may_2026",
    status: "draft",
    message:
      "Hey {{firstName}}! 👋 Really loved your recent posts. We're recruiting creators for an affiliate campaign and thought you'd be a great fit — open to chatting?",
    followUps: [],
    settings: {
      dailyLimit: 100,
      minSecondsBetweenSends: 60,
      maxAttempts: 3,
      senderIds: ["snd_demo_1", "snd_demo_2", "snd_demo_3"],
    },
    webhookUrl: null,
    createdAt: iso(1),
    startedAt: null,
    completedAt: null,
  };

  const ranTargets: Target[] = [
    bakedTarget("cmp_demo_ran", "fitwithjess", "replied", {
      replyText: "Yeah I'd be open to that, send over the details!",
      renderedMessage: "Hey Fitwithjess — loved your content. Would you be open to an affiliate partnership?",
    }),
    bakedTarget("cmp_demo_ran", "marco.travels", "replied", {
      replyText: "Interesting — what kind of rates are we talking?",
      senderId: "snd_demo_2",
    }),
    bakedTarget("cmp_demo_ran", "thedailybrew", "sent"),
    bakedTarget("cmp_demo_ran", "nina.cooks", "sent", { senderId: "snd_demo_2" }),
    bakedTarget("cmp_demo_ran", "urban.sketcher", "sent"),
    bakedTarget("cmp_demo_ran", "gymrat_dave", "failed", {
      lastError: "transient_delivery_error",
      attempts: 3,
    }),
    bakedTarget("cmp_demo_ran", "spam_block_me", "skipped", { skipReason: "suppressed" }),
    bakedTarget("cmp_demo_ran", "fitwithjess_dup", "skipped", { skipReason: "duplicate" }),
  ];

  const draftTargets: Target[] = [
    "lola.makes",
    "thehikingco",
    "chef_andre",
    "minimal.desk",
    "vanlife.kira",
    "code.with.sam",
  ].map((h) =>
    bakedTarget("cmp_demo_draft", h, "queued", { senderId: null, attempts: 0, sentAt: null }),
  );

  const db: Database = {
    clients: [{ id: "cli_demo", name: "Acme Creators Agency", createdAt: iso(30) }],
    apiKeys: [
      {
        id: "key_demo",
        clientId: "cli_demo",
        prefix: DEMO_API_KEY.slice(0, 12),
        hash: hashKey(DEMO_API_KEY),
        label: "Demo / development key",
        createdAt: iso(30),
        lastUsedAt: null,
        revokedAt: null,
      },
    ],
    campaigns: [ranCampaign, draftCampaign],
    targets: [...ranTargets, ...draftTargets],
    senders,
    suppressions: [
      {
        id: "sup_demo_1",
        clientId: "cli_demo",
        handle: "spam_block_me",
        reason: "client_requested",
        createdAt: iso(10),
      },
    ],
    templates: [
      {
        id: "tpl_demo_1",
        clientId: "cli_demo",
        name: "Affiliate first-touch",
        body: "Hey {{firstName}} — loved your content. Would you be open to an affiliate partnership?",
        createdAt: iso(20),
      },
      {
        id: "tpl_demo_2",
        clientId: "cli_demo",
        name: "Friendly creator intro",
        body: "Hi {{firstName}}! 👋 We're recruiting creators for a campaign and thought you'd be perfect — open to chatting?",
        createdAt: iso(15),
      },
    ],
    webhookEvents: [],
    activity: [
      {
        id: "act_seed_1",
        clientId: "cli_demo",
        campaignId: "cmp_demo_ran",
        level: "info",
        message: "Campaign completed: 5 sent, 2 replied, 1 failed.",
        createdAt: iso(1),
      },
    ],
  };

  replaceAll(db);
}

/** Seed only when the database is empty. */
export function ensureSeeded(): void {
  if (read().clients.length === 0) seed();
}
