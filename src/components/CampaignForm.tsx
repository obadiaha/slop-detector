"use client";

import { useState } from "react";
import { createCampaignAction, generateMessageAction } from "@/app/actions";

export function CampaignForm() {
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState("");
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!goal.trim()) return;
    setGenerating(true);
    try {
      setMessage(await generateMessageAction(goal.trim()));
    } finally {
      setGenerating(false);
    }
  }

  const input =
    "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";

  return (
    <form action={createCampaignAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">Campaign name</label>
        <input name="name" required placeholder="client_creator_outreach_may_2026" className={`${input} font-mono`} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          First-touch message · use {"{{firstName}}"} / {"{{handle}}"} for personalization
        </label>
        <textarea
          name="message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hey {{firstName}} — loved your content. Would you be open to an affiliate partnership?"
          className={input}
        />
        <div className="mt-2 flex gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="AI: describe the goal, e.g. affiliate partnership for a skincare brand"
            className={`${input} flex-1`}
          />
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {generating ? "…" : "✨ Draft"}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-muted)]">
          Targets · one Instagram handle per line (or comma-separated)
        </label>
        <textarea name="targets" rows={4} placeholder={"fitwithjess\nmarco.travels\nchef_andre"} className={`${input} font-mono`} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Daily limit</label>
          <input name="dailyLimit" type="number" defaultValue={100} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Min seconds / send</label>
          <input name="minSeconds" type="number" defaultValue={60} className={input} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Webhook URL (optional)</label>
          <input name="webhookUrl" type="url" placeholder="https://…" className={input} />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg gradient-bar px-4 py-2 text-sm font-medium text-white"
      >
        Create campaign
      </button>
    </form>
  );
}
