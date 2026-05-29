import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { effectiveDailyCap } from "@/lib/senders/manager";
import { PageHeader, Card, StatCard, StatusBadge, HealthBar, Empty } from "@/components/ui";
import { addSenderAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function SendersPage() {
  const client = getActiveClient();
  const senders = store.listSenders(client.id);
  const healthy = senders.filter((s) => s.status === "active" || s.status === "warming").length;
  const capacity = senders
    .filter((s) => s.status === "active" || s.status === "warming")
    .reduce((sum, s) => sum + effectiveDailyCap(s), 0);

  const input =
    "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";

  return (
    <>
      <PageHeader
        title="Sender accounts"
        subtitle="The platform manages warmup, limits, health, and rotation for each account."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Accounts" value={senders.length} />
        <StatCard label="Healthy" value={healthy} />
        <StatCard label="Daily capacity" value={capacity} hint="sends/day, after warmup ramp" />
        <StatCard label="Unhealthy" value={senders.filter((s) => s.status === "unhealthy").length} />
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Add sender account
        </h3>
        <form action={addSenderAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Instagram handle</label>
            <input name="handle" required placeholder="acme_outreach_05" className={`${input} font-mono`} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Max daily limit</label>
            <input name="maxDailyLimit" type="number" defaultValue={50} className={input} />
          </div>
          <button className="rounded-lg gradient-bar px-4 py-2 text-sm font-medium text-white">
            Add (starts warming)
          </button>
        </form>
      </Card>

      <div className="mt-6">
        {senders.length === 0 ? (
          <Empty>No sender accounts.</Empty>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-5 py-3">Handle</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Health</th>
                  <th className="px-5 py-3">Warmup</th>
                  <th className="px-5 py-3">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {senders.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--color-surface-hover)]">
                    <td className="px-5 py-3 font-mono">@{s.handle}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3">
                      <HealthBar score={s.healthScore} />
                    </td>
                    <td className="px-5 py-3 text-[var(--color-muted)]">
                      {s.status === "warming" ? `day ${s.warmupDay}/7` : "ramped"}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--color-muted)]">
                      {s.sentToday}/{effectiveDailyCap(s)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
