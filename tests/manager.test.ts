import { describe, it, expect } from "vitest";
import {
  warmupDailyCap,
  effectiveDailyCap,
  canSend,
  selectSender,
  applySuccess,
  applyAccountFault,
} from "@/lib/senders/manager";
import type { SenderAccount } from "@/lib/types";

function mk(partial: Partial<SenderAccount> = {}): SenderAccount {
  return {
    id: "s1",
    clientId: "c1",
    handle: "h1",
    status: "active",
    warmupDay: 7,
    maxDailyLimit: 50,
    healthScore: 100,
    sentToday: 0,
    sentTodayDate: "2026-05-29",
    lastSendAt: null,
    consecutiveFailures: 0,
    createdAt: "2026-05-01T00:00:00Z",
    ...partial,
  };
}

const now = new Date("2026-05-29T12:00:00Z");

describe("sender manager", () => {
  it("ramps the daily cap during warmup", () => {
    expect(warmupDailyCap(mk({ warmupDay: 0 }))).toBe(5);
    expect(warmupDailyCap(mk({ warmupDay: 3 }))).toBe(20);
    expect(warmupDailyCap(mk({ warmupDay: 9 }))).toBe(50);
    expect(effectiveDailyCap(mk({ status: "warming", warmupDay: 0 }))).toBe(5);
    expect(effectiveDailyCap(mk({ status: "active" }))).toBe(50);
  });

  it("enforces daily cap and throttle in canSend", () => {
    expect(canSend(mk({ sentToday: 50, sentTodayDate: "2026-05-29" }), now, 0)).toBe(false);
    expect(canSend(mk({ status: "unhealthy" }), now, 0)).toBe(false);
    const recent = mk({ lastSendAt: new Date(now.getTime() - 30_000).toISOString() });
    expect(canSend(recent, now, 60)).toBe(false); // only 30s since last send
    expect(canSend(recent, now, 20)).toBe(true);
  });

  it("rolls over the daily counter on a new day", () => {
    const stale = mk({ sentToday: 50, sentTodayDate: "2026-05-28" });
    expect(canSend(stale, now, 0)).toBe(true);
  });

  it("selects the least-used eligible sender", () => {
    const pool = [
      mk({ id: "a", sentToday: 5 }),
      mk({ id: "b", sentToday: 1 }),
      mk({ id: "c", status: "unhealthy", sentToday: 0 }),
    ];
    expect(selectSender(pool, now, 0)?.id).toBe("b");
  });

  it("applies success and account-fault transitions", () => {
    const after = applySuccess(mk({ sentToday: 1 }), now);
    expect(after.sentToday).toBe(2);
    expect(after.lastSendAt).toBe(now.toISOString());

    let acc = mk({ healthScore: 100 });
    acc = applyAccountFault(acc, now); // 85
    acc = applyAccountFault(acc, now); // 70
    acc = applyAccountFault(acc, now); // 55, 3 consecutive -> unhealthy
    expect(acc.status).toBe("unhealthy");
    expect(acc.consecutiveFailures).toBe(3);
  });
});
