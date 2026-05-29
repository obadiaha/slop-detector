import type { Campaign, Target, SenderAccount, WebhookEventType } from "./types";
import * as store from "./store";
import { getDriver, type SenderDriver } from "./senders";
import {
  selectSender,
  applySuccess,
  applyAccountFault,
  canSend,
  rolloverDaily,
  effectiveDailyCap,
} from "./senders/manager";
import { normalizeHandle, isValidHandle, isOptOut } from "./compliance";
import { renderTemplate, buildVariables } from "./templating";
import { deliverWebhook } from "./webhooks";
import { id } from "./ids";

// ---------------------------------------------------------------------------
// Campaign execution engine
//
// This is the orchestration core. It is provider-agnostic: all actual delivery
// goes through a SenderDriver. Responsibilities:
//   - ingest targets with normalization, validation, suppression & dedup
//   - drain the send queue while respecting per-account daily caps, warmup
//     ramps, and throttle spacing
//   - retry transient failures with bounded attempts
//   - rotate out account-fault senders (health-based)
//   - poll replies, detect opt-outs, and suppress accordingly
//   - emit signed webhook events for every state change
// ---------------------------------------------------------------------------

export interface RawTarget {
  handle: string;
  variables?: Record<string, string>;
}

export interface IngestResult {
  accepted: number;
  skipped: { duplicate: number; suppressed: number; invalid: number };
  targetIds: string[];
}

/** Ingest a batch of targets into a campaign, applying compliance gates. */
export function ingestTargets(campaign: Campaign, raw: RawTarget[]): IngestResult {
  const suppressed = store.suppressedHandles(campaign.clientId);
  const contacted = store.clientContactedHandles(campaign.clientId);
  const seenInBatch = new Set<string>();

  const result: IngestResult = {
    accepted: 0,
    skipped: { duplicate: 0, suppressed: 0, invalid: 0 },
    targetIds: [],
  };
  const toInsert: Target[] = [];
  const nowIso = new Date().toISOString();

  for (const item of raw) {
    const handle = normalizeHandle(item.handle);
    const base: Target = {
      id: id("tgt"),
      clientId: campaign.clientId,
      campaignId: campaign.id,
      handle,
      variables: item.variables ?? {},
      status: "queued",
      skipReason: null,
      senderId: null,
      renderedMessage: null,
      attempts: 0,
      lastError: null,
      queuedAt: nowIso,
      sentAt: null,
      repliedAt: null,
      replyText: null,
    };

    if (!isValidHandle(handle)) {
      toInsert.push({ ...base, status: "skipped", skipReason: "invalid_handle" });
      result.skipped.invalid++;
      continue;
    }
    if (suppressed.has(handle)) {
      toInsert.push({ ...base, status: "skipped", skipReason: "suppressed" });
      result.skipped.suppressed++;
      continue;
    }
    if (contacted.has(handle) || seenInBatch.has(handle)) {
      toInsert.push({ ...base, status: "skipped", skipReason: "duplicate" });
      result.skipped.duplicate++;
      continue;
    }

    seenInBatch.add(handle);
    contacted.add(handle);
    toInsert.push(base);
    result.accepted++;
    result.targetIds.push(base.id);
  }

  store.addTargets(toInsert);
  store.logActivity(
    campaign.clientId,
    campaign.id,
    "info",
    `Ingested ${raw.length} targets: ${result.accepted} queued, ` +
      `${result.skipped.duplicate} duplicate, ${result.skipped.suppressed} suppressed, ` +
      `${result.skipped.invalid} invalid.`,
  );
  return result;
}

async function emit(
  campaign: Campaign,
  type: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const event = store.recordWebhookEvent({
    clientId: campaign.clientId,
    campaignId: campaign.id,
    type,
    payload,
    url: campaign.webhookUrl,
    delivered: false,
    responseStatus: null,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  if (!campaign.webhookUrl) return;
  const res = await deliverWebhook(campaign.webhookUrl, { id: event.id, type, ...payload });
  store.updateWebhookEvent(event.id, {
    delivered: res.delivered,
    responseStatus: res.status,
    attempts: 1,
  });
}

export interface ProcessOptions {
  /** Virtual clock start. Defaults to now. */
  now?: Date;
  /** Drive the clock forward to drain the whole queue (demo/tests). When false
   *  the engine only sends what's allowed at `now` (a realistic tick). */
  drain?: boolean;
  /** Hard cap on sends in this invocation (safety valve). */
  maxSends?: number;
  /** Explicit driver (tests). Defaults to the configured driver. */
  driver?: SenderDriver;
}

export interface ProcessResult {
  sent: number;
  failed: number;
  skippedNoSender: number;
  completed: boolean;
}

/** Soonest time any assigned sender can send again (for clock advancement). */
function nextAvailableTime(
  senders: SenderAccount[],
  now: Date,
  minSeconds: number,
): Date | null {
  let soonest: number | null = null;
  for (const s of senders) {
    const rolled = rolloverDaily(s, now);
    if (rolled.status !== "active" && rolled.status !== "warming") continue;
    // At daily cap → only frees up at the next UTC day (not modeled here).
    if (rolled.sentToday >= effectiveDailyCap(rolled)) continue;
    const ready = rolled.lastSendAt
      ? new Date(rolled.lastSendAt).getTime() + minSeconds * 1000
      : now.getTime();
    soonest = soonest === null ? ready : Math.min(soonest, ready);
  }
  return soonest === null ? null : new Date(soonest);
}

/**
 * Process a campaign's queue. Sends first-touch DMs to queued targets.
 */
export async function processCampaign(
  campaignId: string,
  options: ProcessOptions = {},
): Promise<ProcessResult> {
  const campaign = store.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  const driver = options.driver ?? getDriver();
  const drain = options.drain ?? false;
  const maxSends = options.maxSends ?? Infinity;
  const minSeconds = campaign.settings.minSecondsBetweenSends;
  let now = options.now ?? new Date();

  const out: ProcessResult = { sent: 0, failed: 0, skippedNoSender: 0, completed: false };

  if (campaign.status === "draft") {
    store.updateCampaign(campaign.id, { status: "running", startedAt: now.toISOString() });
  }

  // Iterate queued targets in FIFO order.
  let guard = 0;
  while (out.sent + out.failed < maxSends) {
    if (guard++ > 100_000) break; // hard safety
    const target = store.listTargets(campaign.id).find((t) => t.status === "queued");
    if (!target) break;

    // Refresh sender pool from store each iteration (state changes mid-loop).
    let pool = store.getSendersByIds(campaign.settings.senderIds);
    const sender = selectSender(pool, now, minSeconds);

    if (!sender) {
      if (!drain) {
        out.skippedNoSender++;
        break; // tick mode: stop until the next invocation
      }
      // Drain mode: try to advance the clock to the next available slot.
      const next = nextAvailableTime(pool, now, minSeconds);
      if (!next || next.getTime() <= now.getTime()) {
        // No sender will ever free up (all at daily cap / unhealthy).
        store.updateTarget(target.id, {
          status: "skipped",
          skipReason: "no_sender_available",
        });
        out.skippedNoSender++;
        continue;
      }
      now = next;
      continue;
    }

    // Claim and render.
    const variables = buildVariables(target.handle, target.variables);
    const rendered = renderTemplate(campaign.message, variables);
    store.updateTarget(target.id, {
      status: "sending",
      senderId: sender.id,
      renderedMessage: rendered,
    });

    const result = await driver.sendDm({
      fromHandle: sender.handle,
      toHandle: target.handle,
      message: rendered,
    });

    if (result.ok) {
      store.saveSender(applySuccess(sender, now));
      store.updateTarget(target.id, {
        status: "sent",
        sentAt: now.toISOString(),
        attempts: target.attempts + 1,
        lastError: null,
      });
      out.sent++;
      await emit(campaign, "target.sent", {
        targetId: target.id,
        handle: target.handle,
        sender: sender.handle,
        externalId: result.externalId,
      });
    } else if (result.accountFault) {
      // Sender's fault: dock health / rotate, do NOT consume the target.
      const updated = applyAccountFault(sender, now);
      store.saveSender(updated);
      store.logActivity(
        campaign.clientId,
        campaign.id,
        "warn",
        `Sender @${sender.handle} reported "${result.error}" — health ${updated.healthScore}, status ${updated.status}.`,
      );
      // Return the target to the queue for another sender.
      store.updateTarget(target.id, { status: "queued", senderId: null });
      // If no usable sender remains, fail the target to avoid an infinite loop.
      pool = store.getSendersByIds(campaign.settings.senderIds);
      if (!pool.some((s) => canSend(s, now, minSeconds))) {
        if (!drain || !nextAvailableTime(pool, now, minSeconds)) {
          store.updateTarget(target.id, {
            status: "failed",
            lastError: "no_healthy_sender",
            attempts: target.attempts + 1,
          });
          out.failed++;
          await emit(campaign, "target.failed", {
            targetId: target.id,
            handle: target.handle,
            error: "no_healthy_sender",
          });
        }
      }
    } else {
      // Transient failure: retry until maxAttempts, then fail.
      const attempts = target.attempts + 1;
      if (attempts < campaign.settings.maxAttempts) {
        store.updateTarget(target.id, {
          status: "queued",
          attempts,
          lastError: result.error ?? "transient_error",
          senderId: null,
        });
        // Count the slot used so we still respect throttle on the sender.
        store.saveSender(applySuccess(sender, now));
      } else {
        store.updateTarget(target.id, {
          status: "failed",
          attempts,
          lastError: result.error ?? "transient_error",
        });
        store.saveSender(applySuccess(sender, now));
        out.failed++;
        await emit(campaign, "target.failed", {
          targetId: target.id,
          handle: target.handle,
          error: result.error,
        });
      }
    }
  }

  // Completion check: no queued targets remain.
  const remaining = store.listTargets(campaign.id).some((t) => t.status === "queued");
  if (!remaining) {
    store.updateCampaign(campaign.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    out.completed = true;
    await emit(campaign, "campaign.completed", {
      campaignId: campaign.id,
      name: campaign.name,
    });
  }

  return out;
}

/**
 * Poll the driver for replies across the campaign's senders, match them to
 * targets, record replies, and suppress opt-outs.
 */
export async function pollCampaignReplies(
  campaignId: string,
  driverArg?: SenderDriver,
): Promise<{ replies: number; optOuts: number }> {
  const campaign = store.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  const driver = driverArg ?? getDriver();

  const senders = store.getSendersByIds(campaign.settings.senderIds);
  const targets = store.listTargets(campaign.id);
  let replies = 0;
  let optOuts = 0;

  for (const sender of senders) {
    const inbound = await driver.checkReplies(sender.handle);
    for (const reply of inbound) {
      const target = targets.find(
        (t) => t.handle === reply.toHandle && (t.status === "sent" || t.status === "replied"),
      );
      if (!target) continue;
      store.updateTarget(target.id, {
        status: "replied",
        repliedAt: reply.receivedAt,
        replyText: reply.text,
      });
      replies++;
      await emit(campaign, "target.replied", {
        targetId: target.id,
        handle: target.handle,
        reply: reply.text,
      });

      if (isOptOut(reply.text)) {
        store.addSuppression(campaign.clientId, target.handle, "opted_out_via_reply");
        optOuts++;
        store.logActivity(
          campaign.clientId,
          campaign.id,
          "info",
          `@${target.handle} opted out — added to suppression list.`,
        );
      }
    }
  }
  return { replies, optOuts };
}
