import type {
  SenderDriver,
  SendRequest,
  SendResult,
  ReplyRecord,
  AccountHealthProbe,
} from "./driver";

// ---------------------------------------------------------------------------
// SimulationDriver
//
// A deterministic-ish stand-in for real Instagram delivery so the entire
// product is demonstrable and testable end-to-end without touching Instagram.
// Outcomes are driven by configurable probabilities and a seedable RNG, so
// tests can pin behavior exactly.
// ---------------------------------------------------------------------------

export interface SimulationConfig {
  /** Probability a send succeeds (vs. transient failure). */
  successRate: number;
  /** Probability a successful send is an account-fault failure instead. */
  accountFaultRate: number;
  /** Probability a delivered DM eventually gets a reply. */
  replyRate: number;
  /** Probability a reply is an opt-out ("stop", "not interested"). */
  optOutRate: number;
  /** Artificial latency per send, ms. Set 0 in tests. */
  latencyMs: number;
  /** Optional fixed seed for reproducible runs. */
  seed?: number;
}

const DEFAULTS: SimulationConfig = {
  successRate: 0.92,
  accountFaultRate: 0.02,
  replyRate: 0.18,
  optOutRate: 0.08,
  latencyMs: 0,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPT_OUT_REPLIES = [
  "Not interested, please stop messaging me.",
  "Unsubscribe.",
  "Please remove me from your list.",
];
const POSITIVE_REPLIES = [
  "Hey! Sure, tell me more about the partnership.",
  "Interesting — what kind of rates are we talking?",
  "Yeah I'd be open to that, send over the details!",
  "Sounds cool, how does the affiliate split work?",
];

export class SimulationDriver implements SenderDriver {
  readonly name = "simulation";
  private cfg: SimulationConfig;
  private rng: () => number;
  /** Queued replies keyed by sender handle, produced at send time. */
  private pendingReplies = new Map<string, ReplyRecord[]>();

  constructor(config: Partial<SimulationConfig> = {}) {
    this.cfg = { ...DEFAULTS, ...config };
    this.rng = this.cfg.seed !== undefined ? mulberry32(this.cfg.seed) : Math.random;
  }

  async sendDm(req: SendRequest): Promise<SendResult> {
    if (this.cfg.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.cfg.latencyMs));
    }

    const roll = this.rng();
    if (roll > this.cfg.successRate) {
      // Failure. Decide whether it's the account's fault.
      const accountFault = this.rng() < this.cfg.accountFaultRate / (1 - this.cfg.successRate || 1);
      return {
        ok: false,
        error: accountFault ? "account_checkpoint_required" : "transient_delivery_error",
        accountFault,
      };
    }

    // Success — maybe schedule a reply for the next checkReplies poll.
    if (this.rng() < this.cfg.replyRate) {
      const isOptOut = this.rng() < this.cfg.optOutRate;
      const pool = isOptOut ? OPT_OUT_REPLIES : POSITIVE_REPLIES;
      const text = pool[Math.floor(this.rng() * pool.length)];
      const list = this.pendingReplies.get(req.fromHandle) ?? [];
      list.push({ toHandle: req.toHandle, text, receivedAt: new Date().toISOString() });
      this.pendingReplies.set(req.fromHandle, list);
    }

    return { ok: true, externalId: `sim_${Math.floor(this.rng() * 1e9).toString(36)}` };
  }

  async checkReplies(fromHandle: string): Promise<ReplyRecord[]> {
    const list = this.pendingReplies.get(fromHandle) ?? [];
    this.pendingReplies.set(fromHandle, []);
    return list;
  }

  async accountHealth(): Promise<AccountHealthProbe> {
    // Simulated accounts are healthy unless the engine has docked them.
    return { healthScore: 100, canSend: true };
  }
}
