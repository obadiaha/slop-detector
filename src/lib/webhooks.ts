import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Webhook signing & delivery
//
// Every webhook request carries an `X-InstaReach-Signature` header of the form
// `t=<unix>,v1=<hex hmac>` where the HMAC is over `${t}.${rawBody}` using the
// client's signing secret — the same scheme Stripe popularized. Receivers
// verify with `verifySignature` to reject forged or replayed events.
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = process.env.INSTAREACH_WEBHOOK_SECRET ?? "whsec_dev_secret";

export function signPayload(
  rawBody: string,
  timestamp: number = Math.floor(Date.now() / 1000),
  secret: string = WEBHOOK_SECRET,
): string {
  const mac = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${mac}`;
}

/** Constant-time verification of a signature header against a raw body. */
export function verifySignature(
  rawBody: string,
  header: string,
  secret: string = WEBHOOK_SECRET,
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string]),
  );
  const t = Number(parts.t);
  const provided = parts.v1;
  if (!t || !provided) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface DeliveryResult {
  delivered: boolean;
  status: number | null;
  error?: string;
}

/**
 * Deliver a signed event to the target URL. Best-effort: network failures are
 * captured rather than thrown so the calling engine never crashes on a bad
 * customer endpoint.
 */
export async function deliverWebhook(
  url: string,
  body: Record<string, unknown>,
  secret?: string,
): Promise<DeliveryResult> {
  const raw = JSON.stringify(body);
  const signature = signPayload(raw, undefined, secret);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-InstaReach-Signature": signature,
        "User-Agent": "InstaReach-Webhooks/1.0",
      },
      body: raw,
      signal: AbortSignal.timeout(8000),
    });
    return { delivered: res.ok, status: res.status };
  } catch (err) {
    return { delivered: false, status: null, error: (err as Error).message };
  }
}
