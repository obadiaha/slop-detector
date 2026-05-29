import type { SenderAccount, SenderStatus } from "../types";

// ---------------------------------------------------------------------------
// Sender account management
//
// Pure functions over SenderAccount. The engine calls these to decide which
// account may send next, to apply warmup ramping, and to react to health
// changes (rotation / recovery). Keeping them pure makes the policy testable
// without a database.
// ---------------------------------------------------------------------------

/**
 * Warmup ramp. New accounts start small and increase their daily ceiling each
 * day until they reach their configured max. This mirrors how real outreach
 * tooling protects fresh sender accounts.
 */
export function warmupDailyCap(account: SenderAccount): number {
  const RAMP = [5, 10, 15, 20, 30, 40, 50]; // day 0..6
  if (account.warmupDay >= RAMP.length) return account.maxDailyLimit;
  return Math.min(RAMP[account.warmupDay], account.maxDailyLimit);
}

/** Effective daily cap given status + warmup stage. */
export function effectiveDailyCap(account: SenderAccount): number {
  if (account.status === "warming") return warmupDailyCap(account);
  return account.maxDailyLimit;
}

export function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Reset the daily counter if we've rolled into a new UTC day. */
export function rolloverDaily(account: SenderAccount, now: Date): SenderAccount {
  const key = todayKey(now);
  if (account.sentTodayDate === key) return account;
  return { ...account, sentToday: 0, sentTodayDate: key };
}

/** Can this account send another DM right now? */
export function canSend(
  account: SenderAccount,
  now: Date,
  minSecondsBetweenSends: number,
): boolean {
  if (account.status !== "active" && account.status !== "warming") return false;
  const rolled = rolloverDaily(account, now);
  if (rolled.sentToday >= effectiveDailyCap(rolled)) return false;
  if (rolled.lastSendAt) {
    const elapsed = (now.getTime() - new Date(rolled.lastSendAt).getTime()) / 1000;
    if (elapsed < minSecondsBetweenSends) return false;
  }
  return true;
}

/**
 * Pick the best available sender from a pool: eligible accounts, fewest sends
 * today first (load balancing), then highest health. Returns null if none can
 * send right now.
 */
export function selectSender(
  pool: SenderAccount[],
  now: Date,
  minSecondsBetweenSends: number,
): SenderAccount | null {
  const eligible = pool
    .map((a) => rolloverDaily(a, now))
    .filter((a) => canSend(a, now, minSecondsBetweenSends));
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => a.sentToday - b.sentToday || b.healthScore - a.healthScore);
  return eligible[0];
}

/** Record a successful send: bump counter, recover a little health. */
export function applySuccess(account: SenderAccount, now: Date): SenderAccount {
  const rolled = rolloverDaily(account, now);
  return {
    ...rolled,
    sentToday: rolled.sentToday + 1,
    lastSendAt: now.toISOString(),
    consecutiveFailures: 0,
    healthScore: Math.min(100, rolled.healthScore + 1),
  };
}

const HEALTH_PENALTY = 15;
const UNHEALTHY_THRESHOLD = 40;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Record an account-fault failure: dock health and, if the account crosses the
 * unhealthy threshold or trips the consecutive-failure limit, mark it unhealthy
 * so it gets rotated out.
 */
export function applyAccountFault(account: SenderAccount, now: Date): SenderAccount {
  const consecutiveFailures = account.consecutiveFailures + 1;
  const healthScore = Math.max(0, account.healthScore - HEALTH_PENALTY);
  let status: SenderStatus = account.status;
  if (healthScore <= UNHEALTHY_THRESHOLD || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    status = "unhealthy";
  }
  return { ...account, consecutiveFailures, healthScore, status, lastSendAt: now.toISOString() };
}

/** Advance an account's warmup by one day; graduate to active when ramped. */
export function advanceWarmup(account: SenderAccount): SenderAccount {
  if (account.status !== "warming") return account;
  const warmupDay = account.warmupDay + 1;
  const status: SenderStatus = warmupDay >= 7 ? "active" : "warming";
  return { ...account, warmupDay, status };
}
