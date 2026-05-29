import Link from "next/link";
import { getActiveClient } from "@/lib/session";
import { read } from "@/lib/db";
import * as store from "@/lib/store";
import { PageHeader, Card, StatusBadge, Empty } from "@/components/ui";
import type { TargetStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: (TargetStatus | "all")[] = [
  "all",
  "queued",
  "sent",
  "replied",
  "failed",
  "skipped",
];

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const client = getActiveClient();
  const campaigns = new Map(store.listCampaigns(client.id).map((c) => [c.id, c.name]));

  let targets = read().targets.filter((t) => t.clientId === client.id);
  if (status !== "all") targets = targets.filter((t) => t.status === status);
  if (q) targets = targets.filter((t) => t.handle.includes(q.toLowerCase()));
  targets = targets.slice(-300).reverse();

  return (
    <>
      <PageHeader
        title="Targets"
        subtitle="Every Instagram profile across all of this workspace's campaigns."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/targets?status=${s}${q ? `&q=${q}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs ${
              status === s
                ? "bg-[var(--color-accent-muted)] text-[var(--color-foreground)]"
                : "border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            {s}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="search handle…"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </form>
      </div>

      {targets.length === 0 ? (
        <Empty>No targets match.</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-5 py-3">Handle</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Campaign</th>
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
                  <td className="px-5 py-3">
                    <Link href={`/campaigns/${t.campaignId}`} className="font-mono text-xs text-[var(--color-info)] hover:underline">
                      {campaigns.get(t.campaignId) ?? t.campaignId}
                    </Link>
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
    </>
  );
}
