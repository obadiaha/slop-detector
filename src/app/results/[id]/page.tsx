"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnalysisResult, getScoreColor } from "@/lib/types";

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  layoutOriginality: { label: "Layout Originality", icon: "⊞" },
  visualDesign: { label: "Visual Design", icon: "◉" },
  copyQuality: { label: "Copy Quality", icon: "Aa" },
  typography: { label: "Typography", icon: "T" },
  imagery: { label: "Imagery", icon: "◎" },
  interactivity: { label: "Interactivity", icon: "⟡" },
};

function ScoreRing({
  score,
  size = 200,
}: {
  score: number;
  size?: number;
}) {
  const color = getScoreColor(score);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
        />
        {/* Score circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring"
          style={{ ["--target-offset" as string]: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-6xl font-black tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-sm text-muted">/100</span>
      </div>
    </div>
  );
}

function ScoreBar({
  score,
  label,
  icon,
  weight,
}: {
  score: number;
  label: string;
  icon: string;
  weight: number;
}) {
  const color = getScoreColor(score);

  return (
    <div className="group">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-zinc-600">
            ({Math.round(weight * 100)}%)
          </span>
        </div>
        <span
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="score-bar-fill h-full rounded-full"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function FindingCard({
  finding,
}: {
  finding: { what: string; why: string; fix: string; severity: string };
}) {
  const severityColors = {
    low: "border-zinc-700 bg-zinc-900/50",
    medium: "border-amber-900/50 bg-amber-950/20",
    high: "border-red-900/50 bg-red-950/20",
  };
  const severityLabels = {
    low: { text: "Low", color: "text-zinc-400" },
    medium: { text: "Medium", color: "text-amber-400" },
    high: { text: "High", color: "text-red-400" },
  };
  const s = finding.severity as keyof typeof severityColors;

  return (
    <div
      className={`rounded-xl border p-5 ${severityColors[s] || severityColors.low}`}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <h4 className="font-medium leading-snug">{finding.what}</h4>
        <span
          className={`shrink-0 text-xs font-medium ${severityLabels[s]?.color || "text-zinc-400"}`}
        >
          {severityLabels[s]?.text || "Info"}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-muted">
          <span className="font-medium text-zinc-300">Why it matters:</span>{" "}
          {finding.why}
        </p>
        <p className="text-muted">
          <span className="font-medium text-accent">How to fix:</span>{" "}
          {finding.fix}
        </p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`/api/results/${params.id}`);
        if (!res.ok) {
          throw new Error("Result not found");
        }
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load results"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [params.id]);

  if (loading) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="scan-pulse mb-4 text-4xl">🔍</div>
          <p className="text-muted">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">😵</div>
          <h1 className="mb-2 text-xl font-bold">Result not found</h1>
          <p className="mb-6 text-muted">
            This scan result may have expired or doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Scan a site
          </button>
        </div>
      </div>
    );
  }

  const displayUrl = result.url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const shareText = `${displayUrl} scored ${result.overallScore}/100 on the AI Slop Detector ${result.ratingEmoji} — ${result.ratingLabel}`;
  const ogImageUrl = `/api/og?score=${result.overallScore}&url=${encodeURIComponent(displayUrl)}`;

  const allFindings = Object.values(result.categories).flatMap(
    (cat) => cat.findings
  );
  const highFindings = allFindings.filter((f) => f.severity === "high");
  const mediumFindings = allFindings.filter((f) => f.severity === "medium");
  const lowFindings = allFindings.filter((f) => f.severity === "low");

  return (
    <div className="grid-bg min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            slop<span className="text-accent">detector</span>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Share on X →
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pt-24 pb-24">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="mb-2 text-sm text-muted">Results for</div>
          <h1 className="mb-8 text-xl font-semibold text-zinc-300">
            {displayUrl}
          </h1>

          {/* Score Ring */}
          <ScoreRing score={result.overallScore} />

          {/* Rating */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-4xl">{result.ratingEmoji}</span>
            <span className="text-2xl font-bold">{result.ratingLabel}</span>
          </div>

          <p className="mt-4 text-sm text-muted">
            Scanned in {(result.scanDurationMs / 1000).toFixed(1)}s
          </p>
        </div>

        {/* Category Breakdown */}
        <section className="mb-16">
          <h2 className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">
            Category Breakdown
          </h2>
          <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
            {Object.entries(result.categories).map(([key, cat]) => {
              const meta = CATEGORY_LABELS[key];
              return (
                <ScoreBar
                  key={key}
                  score={cat.score}
                  label={meta?.label || key}
                  icon={meta?.icon || "•"}
                  weight={cat.weight}
                />
              );
            })}
          </div>
        </section>

        {/* Findings */}
        <section className="mb-16">
          <h2 className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">
            What We Found
          </h2>

          {highFindings.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-red-400">
                🚨 Critical Issues ({highFindings.length})
              </h3>
              <div className="space-y-3">
                {highFindings.map((f, i) => (
                  <FindingCard key={`high-${i}`} finding={f} />
                ))}
              </div>
            </div>
          )}

          {mediumFindings.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-amber-400">
                ⚠️ Moderate Issues ({mediumFindings.length})
              </h3>
              <div className="space-y-3">
                {mediumFindings.map((f, i) => (
                  <FindingCard key={`med-${i}`} finding={f} />
                ))}
              </div>
            </div>
          )}

          {lowFindings.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-zinc-400">
                ℹ️ Minor Notes ({lowFindings.length})
              </h3>
              <div className="space-y-3">
                {lowFindings.map((f, i) => (
                  <FindingCard key={`low-${i}`} finding={f} />
                ))}
              </div>
            </div>
          )}

          {allFindings.length === 0 && (
            <p className="text-muted">
              No specific findings to report. The site looks clean!
            </p>
          )}
        </section>

        {/* Screenshot */}
        {result.screenshotUrl && (
          <section className="mb-16">
            <h2 className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">
              Screenshot
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.screenshotUrl}
                alt={`Screenshot of ${displayUrl}`}
                className="w-full"
              />
            </div>
          </section>
        )}

        {/* Share Card */}
        <section className="mb-16">
          <h2 className="mb-6 text-sm font-medium tracking-widest text-muted uppercase">
            Share Your Score
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImageUrl}
              alt="Score card"
              className="w-full"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-surface px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Share on X
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/results/${result.id}`
                );
              }}
              className="rounded-xl bg-surface px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Copy Link
            </button>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Scan Another Site
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-24 border-t border-border pt-8 pb-12 text-center">
          <p className="text-sm text-zinc-600">
            Built by humans who are tired of every website looking the same.
          </p>
        </footer>
      </main>
    </div>
  );
}
