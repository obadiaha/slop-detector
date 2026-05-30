import Link from "next/link";
import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { campaignStats } from "@/lib/analytics";
import { PageHeader, Card, StatusBadge, Empty } from "@/components/ui";
import { CampaignForm } from "@/components/CampaignForm";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const client = await getActiveClient();
  const campaigns = store.listCampaigns(client.id);

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Create a campaign, submit targets, then run it." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            New campaign
          </h2>
          <Card className="p-5">
            <CampaignForm />
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            All campaigns
          </h2>
          {campaigns.length === 0 ? (
            <Empty>No campaigns yet — create one on the left.</Empty>
          ) : (
            <Card>
              <div className="divide-y divide-[var(--color-border)]">
                {campaigns.map((c) => {
                  const s = campaignStats(c.id);
                  return (
                    <Link
                      key={c.id}
                      href={`/campaigns/${c.id}`}
                      className="block px-5 py-4 hover:bg-[var(--color-surface-hover)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-sm">{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-2 text-xs text-[var(--color-muted)]">
                        {s.total} targets · {s.queued} queued · {s.sent + s.replied} sent ·{" "}
                        {s.replied} replied · {s.failed} failed · {s.skipped} skipped
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
