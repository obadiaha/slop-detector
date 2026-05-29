import { describe, it, expect } from "vitest";
import { signPayload, verifySignature } from "@/lib/webhooks";

describe("webhook signing", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ type: "target.sent", handle: "fitwithjess" });

  it("produces a verifiable signature", () => {
    const sig = signPayload(body, 1_700_000_000, secret);
    expect(sig).toMatch(/^t=1700000000,v1=[a-f0-9]{64}$/);
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = signPayload(body, 1_700_000_000, secret);
    expect(verifySignature(body + "x", sig, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sig = signPayload(body, 1_700_000_000, secret);
    expect(verifySignature(body, sig, "other")).toBe(false);
  });

  it("rejects malformed headers", () => {
    expect(verifySignature(body, "garbage", secret)).toBe(false);
  });
});
