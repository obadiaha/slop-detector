// ---------------------------------------------------------------------------
// SenderDriver — the seam between the managed product layer and actual delivery
//
// Everything above this interface (campaigns, queueing, rate limits, dedup,
// suppression, webhooks, reporting) is provider-agnostic orchestration. The
// driver is the ONLY place that knows how a DM physically reaches Instagram.
//
// Swapping the simulation driver for a production driver is a one-line change
// in getDriver(). The orchestration layer never changes.
// ---------------------------------------------------------------------------

export interface SendRequest {
  /** Sender account handle performing the send. */
  fromHandle: string;
  /** Recipient Instagram handle (no @). */
  toHandle: string;
  /** Fully-rendered message text. */
  message: string;
}

export interface SendResult {
  /** True if the DM was accepted for delivery. */
  ok: boolean;
  /** Provider-side message id when available. */
  externalId?: string;
  /** Failure detail when ok is false. */
  error?: string;
  /** When true, the failure is the sender account's fault (e.g. checkpointed)
   *  and the engine should dock the account's health, not the target. */
  accountFault?: boolean;
}

export interface ReplyRecord {
  toHandle: string;
  text: string;
  receivedAt: string;
}

export interface AccountHealthProbe {
  /** 0–100; lower means the account is at risk and should be rotated out. */
  healthScore: number;
  /** True if the account can currently send. */
  canSend: boolean;
  detail?: string;
}

export interface SenderDriver {
  readonly name: string;
  /** Send a single first-touch or follow-up DM. */
  sendDm(req: SendRequest): Promise<SendResult>;
  /** Poll for new inbound replies to messages sent from `fromHandle`. */
  checkReplies(fromHandle: string): Promise<ReplyRecord[]>;
  /** Probe the operational health of a sender account. */
  accountHealth(handle: string): Promise<AccountHealthProbe>;
}
