import { notFound } from "next/navigation";
import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { campaignStats } from "@/lib/analytics";
import { PageHeader, Card, StatCard, StatusBadge, Empty } from "@/components/ui";
import {
  runCampaignAction,
  pollRepliesAction,
  pauseResumeAction,
  addTargetsAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getActiveClient();
  const campaign = store.getCampaign(id, client.id);
  if (!campaign) notFound();

  const stats = campaignStats(campaign.id);
  const targets = store.listTargets(campaign.id);
  const events = store.listWebhookEvents(campaign.id).slice(-10).reverse();
  const senders = store.getSendersByIds(campaign.settings.senderIds);

  return (
    <>
      <PageHeader
        title={campaign.name}
        subtitle={`Created ${new Date(campaign.createdAt).toLocaleString()}`}
        action={<StatusBadge status={campaign.status} />}
      />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-2">
        <form action={runCampaignAction.bind(null, campaign.id)}>
          <button className="rounded-lg gradient-bar px-4 py-2 text-sm font-medium text-white">
            ▶ Run queue ({stats.queued})
          </button>
        </form>
        <form action={pollRepliesAction.bind(null, campaign.id)}>
          <button className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">
            ↻ Poll replies
          </button>
        </form>
        {(campaign.status === "running" || campaign.status === "paused") && (
          <form action={pauseResumeAction.bind(null, campaign.id)}>
            <button className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">
              {campaign.status === "running" ? "⏸ Pause" : "▶ Resume"}
            </button>
          </form>
        )}
        <a
          href={`/api/v1/campaigns/${campaign.id}/results?format=csv`}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]"
        >
          ⭳ Export CSV
        </a>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <StatCard label="Queued" value={stats.queued} />
        <StatCard label="Sent" value={stats.sent} />
        <StatCard label="Replied" value={stats.replied} hint={pct(stats.replyRate)} />
        <StatCard label="Failed" value={stats.failed} />
        <StatCard label="Skipped" value={stats.skipped} />
        <StatCard label="Delivery" value={pct(stats.deliveryRate)} />
      </div>

      {/* Message + config */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            First-touch message
          </h3>
          <p className="whitespace-pre-wrap rounded-lg bg-[var(--color-surface-2)] p-4 text-sm">
            {campaign.message}
          </p>
          {campaign.followUps.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Follow-ups
              </h4>
              <ul className="space-y-2 text-sm">
                {campaign.followUps.map((f, i) => (
                  <li key={i} className="rounded-lg bg-[var(--color-surface-2)] p-3">
                    <span className="text-xs text-[var(--color-muted)]">
                      +{f.delayHours}h · if {f.condition}
                    </span>
                    <p className="mt-1">{f.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Configuration
          </h3>
          <dl className="space-y-2 text-sm">
            <Row k="Daily limit" v={String(campaign.settings.dailyLimit)} />
            <Row k="Throttle" v={`${campaign.settings.minSecondsBetweenSends}s / send`} />
            <Row k="Max attempts" v={String(campaign.settings.maxAttempts)} />
            <Row k="Webhook" v={campaign.webhookUrl ?? "—"} />
          </dl>
          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Senders ({senders.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {senders.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="font-mono">@{s.handle}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Add targets */}
      <Card className="mt-6 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Add targets
        </h3>
        <form action={addTargetsAction.bind(null, campaign.id)} className="flex flex-col gap-3 sm:flex-row">
          <textarea
            name="targets"
            rows={2}
            placeholder="one handle per line, or comma-separated"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button className="shrink-0 self-start rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">
            Add
          </button>
        </form>
      </Card>

      {/* Targets table */}
      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Targets ({targets.length})
      </h3>
      {targets.length === 0 ? (
        <Empty>No targets yet.</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-5 py-3">Handle</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sender</th>
                <th className="px-5 py-3">Reply / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {targets.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--color-surface-hover)]">
                  <td className="px-5 py-3 font-mono">@{t.handle}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={t.status} />
                    {t.skipReason && (
                      <span className="ml-2 text-xs text-[var(--color-muted)]">{t.skipReason}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">
                    {senders.find((s) => s.id === t.senderId)?.handle ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-5 py-3 text-[var(--color-muted)]">
                    {t.replyText ?? t.lastError ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Webhook events */}
      {events.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Recent webhook events
          </h3>
          <Card className="p-4">
            <ul className="space-y-2 text-xs font-mono">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="text-[var(--color-accent-3)]">{e.type}</span>
                  <span className="text-[var(--color-muted)]">
                    {e.url ? (e.delivered ? `→ ${e.responseStatus}` : "delivery failed") : "no webhook url"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{k}</dt>
      <dd className="truncate text-right">{v}</dd>
    </div>
  );
}
