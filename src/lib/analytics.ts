import * as store from "./store";
import type { Target, Campaign, SenderAccount } from "./types";

// ---------------------------------------------------------------------------
// Reporting / analytics
// ---------------------------------------------------------------------------

export interface CampaignStats {
  total: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  skipped: number;
  replied: number;
  /** replied / (sent + replied), 0–1. */
  replyRate: number;
  /** (sent + replied) / (total - skipped), 0–1. */
  deliveryRate: number;
}

export function campaignStats(campaignId: string): CampaignStats {
  return summarize(store.listTargets(campaignId));
}

export function summarize(targets: Target[]): CampaignStats {
  const s: CampaignStats = {
    total: targets.length,
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    replied: 0,
    replyRate: 0,
    deliveryRate: 0,
  };
  for (const t of targets) s[t.status]++;
  const delivered = s.sent + s.replied;
  s.replyRate = delivered > 0 ? s.replied / delivered : 0;
  const attempted = s.total - s.skipped;
  s.deliveryRate = attempted > 0 ? delivered / attempted : 0;
  return s;
}

export interface ClientOverview {
  campaigns: number;
  activeCampaigns: number;
  senders: number;
  healthySenders: number;
  totalContacted: number;
  totalReplied: number;
  replyRate: number;
  suppressions: number;
}

export function clientOverview(clientId: string): ClientOverview {
  const campaigns: Campaign[] = store.listCampaigns(clientId);
  const senders: SenderAccount[] = store.listSenders(clientId);
  let totalContacted = 0;
  let totalReplied = 0;
  for (const c of campaigns) {
    const st = campaignStats(c.id);
    totalContacted += st.sent + st.replied;
    totalReplied += st.replied;
  }
  return {
    campaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === "running").length,
    senders: senders.length,
    healthySenders: senders.filter((s) => s.status === "active" || s.status === "warming").length,
    totalContacted,
    totalReplied,
    replyRate: totalContacted > 0 ? totalReplied / totalContacted : 0,
    suppressions: store.listSuppressions(clientId).length,
  };
}

/** Render campaign results as CSV. */
export function targetsToCsv(targets: Target[]): string {
  const headers = [
    "handle",
    "status",
    "skip_reason",
    "sender_id",
    "attempts",
    "queued_at",
    "sent_at",
    "replied_at",
    "reply_text",
    "last_error",
  ];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = targets.map((t) =>
    [
      t.handle,
      t.status,
      t.skipReason ?? "",
      t.senderId ?? "",
      t.attempts,
      t.queuedAt,
      t.sentAt ?? "",
      t.repliedAt ?? "",
      t.replyText ?? "",
      t.lastError ?? "",
    ]
      .map(escape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
