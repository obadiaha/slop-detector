import type { ReactNode } from "react";
import type { TargetStatus, SenderStatus, CampaignStatus } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--color-muted)]">{hint}</div>}
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  // target
  queued: "bg-zinc-500/15 text-zinc-300",
  sending: "bg-sky-500/15 text-sky-300",
  sent: "bg-blue-500/15 text-blue-300",
  replied: "bg-green-500/15 text-green-300",
  failed: "bg-red-500/15 text-red-300",
  skipped: "bg-amber-500/15 text-amber-300",
  // sender
  active: "bg-green-500/15 text-green-300",
  warming: "bg-amber-500/15 text-amber-300",
  paused: "bg-zinc-500/15 text-zinc-300",
  unhealthy: "bg-red-500/15 text-red-300",
  retired: "bg-zinc-700/30 text-zinc-400",
  // campaign
  draft: "bg-zinc-500/15 text-zinc-300",
  running: "bg-sky-500/15 text-sky-300",
  completed: "bg-green-500/15 text-green-300",
};

export function StatusBadge({
  status,
}: {
  status: TargetStatus | SenderStatus | CampaignStatus | string;
}) {
  const cls = STATUS_COLORS[status] ?? "bg-zinc-500/15 text-zinc-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums text-[var(--color-muted)]">{score}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-muted)]">
      {children}
    </div>
  );
}
