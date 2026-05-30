import Link from "next/link";
import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { clientOverview, campaignStats } from "@/lib/analytics";
import { PageHeader, StatCard, Card, StatusBadge, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function DashboardPage() {
  const client = await getActiveClient();
  const overview = clientOverview(client.id);
  const campaigns = store.listCampaigns(client.id);
  const activity = store.listActivity(client.id, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Workspace: ${client.name}`}
        action={
          <Link
            href="/campaigns"
            className="rounded-lg gradient-bar px-4 py-2 text-sm font-medium text-white"
          >
            New campaign
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Campaigns" value={overview.campaigns} hint={`${overview.activeCampaigns} running`} />
        <StatCard
          label="Contacted"
          value={overview.totalContacted}
          hint={`${overview.totalReplied} replied`}
        />
        <StatCard label="Reply rate" value={pct(overview.replyRate)} hint="across all campaigns" />
        <StatCard
          label="Senders"
          value={`${overview.healthySenders}/${overview.senders}`}
          hint="healthy / total"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Campaigns
          </h2>
          {campaigns.length === 0 ? (
            <Empty>No campaigns yet.</Empty>
          ) : (
            <Card>
              <div className="divide-y divide-[var(--color-border)]">
                {campaigns.map((c) => {
                  const s = campaignStats(c.id);
                  return (
                    <Link
                      key={c.id}
                      href={`/campaigns/${c.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-surface-hover)]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm">{c.name}</div>
                        <div className="mt-1 text-xs text-[var(--color-muted)]">
                          {s.total} targets · {s.sent + s.replied} sent · {s.replied} replied ·{" "}
                          {s.failed} failed
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <Empty>No activity.</Empty>
          ) : (
            <Card className="p-4">
              <ul className="space-y-3 text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <span
                      className={
                        a.level === "error"
                          ? "text-[var(--color-danger)]"
                          : a.level === "warn"
                            ? "text-[var(--color-warn)]"
                            : "text-[var(--color-muted)]"
                      }
                    >
                      •
                    </span>
                    <span className="text-[var(--color-foreground)]/90">{a.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
