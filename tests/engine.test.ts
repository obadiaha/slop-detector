import { describe, it, expect, beforeEach } from "vitest";
import { __resetForTests } from "@/lib/db";
import * as store from "@/lib/store";
import { ingestTargets, processCampaign, pollCampaignReplies, type RawTarget } from "@/lib/engine";
import { SimulationDriver } from "@/lib/senders/simulation";
import type { CampaignSettings } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

function setup(opts: { senders?: number; maxDailyLimit?: number; minSeconds?: number; maxAttempts?: number } = {}) {
  const { senders = 1, maxDailyLimit = 100, minSeconds = 0, maxAttempts = 2 } = opts;
  const client = store.createClient("Test Co");
  const senderRecords = Array.from({ length: senders }, (_, i) =>
    store.createSender({
      clientId: client.id,
      handle: `sender_${i}`,
      status: "active",
      warmupDay: 7,
      maxDailyLimit,
      healthScore: 100,
      sentToday: 0,
      sentTodayDate: today,
      lastSendAt: null,
      consecutiveFailures: 0,
    }),
  );
  const settings: CampaignSettings = {
    dailyLimit: 1000,
    minSecondsBetweenSends: minSeconds,
    maxAttempts,
    senderIds: senderRecords.map((s) => s.id),
  };
  const campaign = store.createCampaign({
    clientId: client.id,
    name: "c1",
    message: "Hey {{firstName}} — loved your content!",
    webhookUrl: null,
    settings,
  });
  return { client, campaign, senders: senderRecords };
}

const handles = (...hs: string[]): RawTarget[] => hs.map((h) => ({ handle: h }));

beforeEach(() => __resetForTests());

describe("ingest + dedup + compliance", () => {
  it("dedups within a batch and rejects invalid handles", () => {
    const { campaign } = setup();
    const res = ingestTargets(campaign, handles("alice", "alice", "@Bob", "not valid!!"));
    expect(res.accepted).toBe(2);
    expect(res.skipped.duplicate).toBe(1);
    expect(res.skipped.invalid).toBe(1);
  });

  it("dedups across campaigns for the same client", () => {
    const { client, campaign } = setup();
    ingestTargets(campaign, handles("alice"));
    const c2 = store.createCampaign({
      clientId: client.id,
      name: "c2",
      message: "Hi {{firstName}}!",
      webhookUrl: null,
      settings: campaign.settings,
    });
    const res = ingestTargets(c2, handles("alice", "carol"));
    expect(res.skipped.duplicate).toBe(1);
    expect(res.accepted).toBe(1);
  });

  it("skips suppressed handles", () => {
    const { client, campaign } = setup();
    store.addSuppression(client.id, "blocked", "test");
    const res = ingestTargets(campaign, handles("blocked", "ok"));
    expect(res.skipped.suppressed).toBe(1);
    expect(res.accepted).toBe(1);
  });
});

describe("queue processing", () => {
  it("sends all queued targets when senders have capacity", async () => {
    const { campaign } = setup();
    ingestTargets(campaign, handles("a", "b", "c", "d"));
    const driver = new SimulationDriver({ successRate: 1, replyRate: 0, latencyMs: 0, seed: 1 });
    const res = await processCampaign(campaign.id, { drain: true, driver });
    expect(res.sent).toBe(4);
    expect(res.completed).toBe(true);
    expect(store.getCampaign(campaign.id)?.status).toBe("completed");
  });

  it("respects the per-sender daily cap", async () => {
    const { campaign } = setup({ maxDailyLimit: 2 });
    ingestTargets(campaign, handles("a", "b", "c", "d", "e"));
    const driver = new SimulationDriver({ successRate: 1, replyRate: 0, seed: 2 });
    const res = await processCampaign(campaign.id, { drain: true, driver });
    expect(res.sent).toBe(2);
    expect(res.skippedNoSender).toBe(3);
  });

  it("stops at the daily cap but resumes the next day (rollover)", async () => {
    const { campaign, senders } = setup({ maxDailyLimit: 2 });
    ingestTargets(campaign, handles("a", "b", "c"));
    const driver = new SimulationDriver({ successRate: 1, replyRate: 0, seed: 7 });
    await processCampaign(campaign.id, { drain: false, driver });
    expect(store.listTargets(campaign.id).filter((t) => t.status === "sent").length).toBe(2);

    // Simulate the next day: reset counters and re-queue the leftover.
    for (const s of senders) store.saveSender({ ...store.getSendersByIds([s.id])[0], sentToday: 0, sentTodayDate: "2099-01-01" });
    const leftover = store.listTargets(campaign.id).find((t) => t.status === "skipped");
    if (leftover) store.updateTarget(leftover.id, { status: "queued", skipReason: null });
    const res = await processCampaign(campaign.id, { drain: false, driver, now: new Date("2099-01-01T00:00:00Z") });
    expect(res.sent).toBeGreaterThanOrEqual(1);
  });

  it("retries transient failures then marks failed", async () => {
    const { campaign } = setup({ maxAttempts: 2 });
    ingestTargets(campaign, handles("a"));
    const driver = new SimulationDriver({ successRate: 0, replyRate: 0, seed: 3 });
    const res = await processCampaign(campaign.id, { drain: true, driver });
    expect(res.failed).toBe(1);
    const target = store.listTargets(campaign.id)[0];
    expect(target.status).toBe("failed");
    expect(target.attempts).toBe(2);
  });

  it("renders the message per target", async () => {
    const { campaign } = setup();
    ingestTargets(campaign, handles("fitwithjess"));
    const driver = new SimulationDriver({ successRate: 1, replyRate: 0, seed: 4 });
    await processCampaign(campaign.id, { drain: true, driver });
    const target = store.listTargets(campaign.id)[0];
    expect(target.renderedMessage).toBe("Hey Fitwithjess — loved your content!");
  });
});

describe("replies + opt-out", () => {
  it("records replies and suppresses opt-outs", async () => {
    const { client, campaign } = setup();
    ingestTargets(campaign, handles("alice"));
    // Force a delivered DM that gets an opt-out reply.
    const driver = new SimulationDriver({
      successRate: 1,
      replyRate: 1,
      optOutRate: 1,
      latencyMs: 0,
      seed: 9,
    });
    await processCampaign(campaign.id, { drain: true, driver });
    const poll = await pollCampaignReplies(campaign.id, driver);
    expect(poll.replies).toBe(1);
    expect(poll.optOuts).toBe(1);
    expect(store.listTargets(campaign.id)[0].status).toBe("replied");
    expect(store.suppressedHandles(client.id).has("alice")).toBe(true);
  });
});
