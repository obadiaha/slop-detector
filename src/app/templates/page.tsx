import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { extractPlaceholders } from "@/lib/templating";
import { PageHeader, Card, Empty } from "@/components/ui";
import { addTemplateAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  const client = getActiveClient();
  const templates = store.listTemplates(client.id);

  const input =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";

  return (
    <>
      <PageHeader title="Templates" subtitle="Reusable message templates with personalization variables." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            New template
          </h3>
          <form action={addTemplateAction} className="space-y-3">
            <input name="name" required placeholder="Template name" className={input} />
            <textarea
              name="body"
              required
              rows={4}
              placeholder="Hey {{firstName}} — loved your content…"
              className={input}
            />
            <button className="rounded-lg gradient-bar px-4 py-2 text-sm font-medium text-white">
              Save template
            </button>
          </form>
        </Card>

        <div>
          {templates.length === 0 ? (
            <Empty>No templates.</Empty>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {extractPlaceholders(t.body).map((p) => `{{${p}}}`).join(" ") || "no variables"}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-foreground)]/90">
                    {t.body}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
