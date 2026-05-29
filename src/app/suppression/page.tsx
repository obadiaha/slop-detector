import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { PageHeader, Card, Empty } from "@/components/ui";
import { addSuppressionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function SuppressionPage() {
  const client = getActiveClient();
  const suppressions = store.listSuppressions(client.id);

  return (
    <>
      <PageHeader
        title="Suppression list"
        subtitle="Client-level do-not-contact. Handles here are skipped in every campaign; opt-out replies are added automatically."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Add to suppression list
          </h3>
          <form action={addSuppressionAction} className="space-y-3">
            <textarea
              name="handles"
              required
              rows={4}
              placeholder={"one handle per line\nor comma-separated"}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <button className="rounded-lg gradient-bar px-4 py-2 text-sm font-medium text-white">
              Suppress
            </button>
          </form>
        </Card>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Suppressed ({suppressions.length})
          </h3>
          {suppressions.length === 0 ? (
            <Empty>No suppressed handles.</Empty>
          ) : (
            <Card className="divide-y divide-[var(--color-border)]">
              {suppressions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-mono">@{s.handle}</span>
                  <span className="text-xs text-[var(--color-muted)]">{s.reason}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
