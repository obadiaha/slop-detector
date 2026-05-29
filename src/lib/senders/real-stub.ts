import type { SenderDriver, SendResult, ReplyRecord, AccountHealthProbe } from "./driver";

// ---------------------------------------------------------------------------
// RealInstagramDriver — intentional, documented stub
//
// This is the seam where a production Instagram delivery integration plugs in.
// It is deliberately NOT implemented in this repository.
//
// A production implementation is the "hard part" the bounty asks a vendor to
// own and operate. It would live behind an external, separately-operated
// service and would be responsible for: authenticated sender sessions, the
// official Instagram messaging surface where eligible, proxy/session health,
// platform-change maintenance, and abuse/rate monitoring.
//
// It must NOT contain credential-stuffing, scraping, or anti-detection/evasion
// logic. The orchestration layer above this interface already enforces rate
// limits, warmup, suppression, opt-out, and dedup — a real driver only has to
// faithfully send one message and report the outcome.
//
// To activate: implement the methods, then return this driver from getDriver()
// when INSTAREACH_DRIVER=real.
// ---------------------------------------------------------------------------

export class RealInstagramDriver implements SenderDriver {
  readonly name = "real";

  // Signatures intentionally omit the (unused) parameters; they still satisfy
  // the SenderDriver interface. Implement them to activate production delivery.
  async sendDm(): Promise<SendResult> {
    throw new Error(
      "RealInstagramDriver is not implemented in this open repository. " +
        "Set INSTAREACH_DRIVER=simulation, or wire this method to your managed delivery service.",
    );
  }

  async checkReplies(): Promise<ReplyRecord[]> {
    throw new Error("RealInstagramDriver.checkReplies is not implemented.");
  }

  async accountHealth(): Promise<AccountHealthProbe> {
    throw new Error("RealInstagramDriver.accountHealth is not implemented.");
  }
}
