// ---------------------------------------------------------------------------
// InstaReach domain model
//
// The platform is multi-tenant: every record is scoped to a Client (workspace).
// API keys are scoped to a single client, so an integrator can only ever see
// and act on their own data.
// ---------------------------------------------------------------------------

/** A tenant / workspace. One per agency client. */
export interface Client {
  id: string;
  name: string;
  /** Hashed API key lives on ApiKey; this is a convenience pointer. */
  createdAt: string;
}

/** API key scoped to a single client. We store only a hash + a display prefix. */
export interface ApiKey {
  id: string;
  clientId: string;
  /** First 12 chars of the raw key, e.g. "ir_live_a1b2" — shown in the UI. */
  prefix: string;
  /** SHA-256 hash of the full raw key. The raw key is never persisted. */
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Per-target outreach status. */
export type TargetStatus =
  | "queued" // accepted, waiting for a send slot
  | "sending" // claimed by the engine, in flight
  | "sent" // DM delivered by the sender driver
  | "failed" // delivery failed after retries
  | "skipped" // suppressed, duplicate, opted-out, or invalid
  | "replied"; // target replied to the DM

export type SkipReason =
  | "duplicate"
  | "suppressed"
  | "opted_out"
  | "invalid_handle"
  | "no_sender_available";

/** A single Instagram profile being contacted within a campaign. */
export interface Target {
  id: string;
  clientId: string;
  campaignId: string;
  /** Normalized handle without the leading @. */
  handle: string;
  /** Free-form personalization variables merged into the message template. */
  variables: Record<string, string>;
  status: TargetStatus;
  skipReason: SkipReason | null;
  /** Sender account that handled (or will handle) this target. */
  senderId: string | null;
  /** The fully-rendered message that was/will be sent. */
  renderedMessage: string | null;
  attempts: number;
  lastError: string | null;
  queuedAt: string;
  sentAt: string | null;
  repliedAt: string | null;
  replyText: string | null;
}

export type CampaignStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed";

/** Follow-up step in a sequence. Sent only if the branch condition holds. */
export interface FollowUpStep {
  /** Wait this many hours after the previous step before sending. */
  delayHours: number;
  message: string;
  /** Only send this step when the target has NOT replied ("no_reply")
   *  or regardless ("always"). Replied targets are never followed up. */
  condition: "no_reply" | "always";
}

export interface CampaignSettings {
  /** Hard cap on DMs per day across all of this campaign's senders. */
  dailyLimit: number;
  /** Minimum seconds between two sends from the same sender (throttle). */
  minSecondsBetweenSends: number;
  /** Max delivery attempts before a target is marked failed. */
  maxAttempts: number;
  /** Sender accounts assigned to this campaign (ids). */
  senderIds: string[];
}

export interface Campaign {
  id: string;
  clientId: string;
  /** Human/key supplied campaign name, e.g. "client_creator_outreach_may_2026". */
  name: string;
  status: CampaignStatus;
  /** First-touch message template with {{variable}} placeholders. */
  message: string;
  followUps: FollowUpStep[];
  settings: CampaignSettings;
  /** Endpoint that receives signed webhook events for this campaign. */
  webhookUrl: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export type SenderStatus =
  | "warming" // in ramp-up, reduced daily cap
  | "active" // healthy, full cap
  | "paused" // temporarily held (limit hit / manual)
  | "unhealthy" // failing, will be rotated out
  | "retired"; // permanently removed

/** A sending Instagram account managed by the platform. */
export interface SenderAccount {
  id: string;
  clientId: string;
  handle: string;
  status: SenderStatus;
  /** Day index since the account started warming, drives the ramp schedule. */
  warmupDay: number;
  /** Configured maximum daily sends once fully warmed. */
  maxDailyLimit: number;
  /** Rolling health score 0–100. Drops on failures, recovers on successes. */
  healthScore: number;
  /** Sends made during the current UTC day (reset by the engine). */
  sentToday: number;
  /** Day key (YYYY-MM-DD) the sentToday counter belongs to. */
  sentTodayDate: string;
  lastSendAt: string | null;
  consecutiveFailures: number;
  createdAt: string;
}

/** Client-level suppression entry — never contact this handle again. */
export interface Suppression {
  id: string;
  clientId: string;
  handle: string;
  reason: string;
  createdAt: string;
}

export type WebhookEventType =
  | "target.sent"
  | "target.failed"
  | "target.skipped"
  | "target.replied"
  | "campaign.completed";

export interface WebhookEvent {
  id: string;
  clientId: string;
  campaignId: string;
  type: WebhookEventType;
  payload: Record<string, unknown>;
  url: string | null;
  /** Delivery bookkeeping. */
  delivered: boolean;
  responseStatus: number | null;
  attempts: number;
  createdAt: string;
}

/** Reusable message template with personalization variables. */
export interface Template {
  id: string;
  clientId: string;
  name: string;
  body: string;
  createdAt: string;
}

/** Append-only activity log for observability. */
export interface ActivityEvent {
  id: string;
  clientId: string;
  campaignId: string | null;
  level: "info" | "warn" | "error";
  message: string;
  createdAt: string;
}

/** Top-level shape persisted to disk. */
export interface Database {
  clients: Client[];
  apiKeys: ApiKey[];
  campaigns: Campaign[];
  targets: Target[];
  senders: SenderAccount[];
  suppressions: Suppression[];
  templates: Template[];
  webhookEvents: WebhookEvent[];
  activity: ActivityEvent[];
}
