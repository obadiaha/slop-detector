import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { getDriver } from "@/lib/senders";
import { DEMO_API_KEY } from "@/lib/seed";
import { activeBackendName } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const client = await getActiveClient();
  const keys = store.listApiKeys(client.id);
  const driver = getDriver().name;
  const storage = activeBackendName();

  const curl = `curl -X POST http://localhost:3000/api/v1/campaigns \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaign": "client_creator_outreach_may_2026",
    "message": "Hey {{firstName}} — loved your content. Open to an affiliate partnership?",
    "targets": ["fitwithjess", "marco.travels", "chef_andre"]
  }'`;

  return (
    <>
      <PageHeader title="API & Settings" subtitle={`Workspace: ${client.name} (${client.id})`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Active delivery driver
          </h3>
          <p className="text-2xl font-bold capitalize">{driver}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {driver === "simulation"
              ? "DMs are mocked end-to-end. Set INSTAREACH_DRIVER=real to use a production driver (see README)."
              : "Production driver active."}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm">
            <span className="text-[var(--color-muted)]">Storage backend</span>
            <span className="font-mono capitalize">{storage}</span>
          </div>
          {storage === "memory" && (
            <p className="mt-1 text-xs text-[var(--color-warn)]">
              Ephemeral — data resets on cold start. Add Vercel KV / Upstash to persist.
            </p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            API keys
          </h3>
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
                <div>
                  <div className="font-mono text-sm">{k.prefix}…</div>
                  <div className="text-xs text-[var(--color-muted)]">{k.label}</div>
                </div>
                <span className="text-xs text-[var(--color-muted)]">
                  {k.revokedAt ? "revoked" : k.lastUsedAt ? `used ${new Date(k.lastUsedAt).toLocaleString()}` : "never used"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Dev key (sample data only): <span className="font-mono text-[var(--color-foreground)]">{DEMO_API_KEY}</span>
          </p>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Quick start — create &amp; run a campaign
        </h3>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-surface-2)] p-4 text-xs leading-relaxed">
          <code>{curl}</code>
        </pre>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Then <span className="font-mono">POST /api/v1/campaigns/&lt;id&gt;/start</span> to run the queue,{" "}
          <span className="font-mono">/poll-replies</span> to fetch replies, and{" "}
          <span className="font-mono">/results?format=csv</span> to export. Full reference in the README.
        </p>
      </Card>
    </>
  );
}
