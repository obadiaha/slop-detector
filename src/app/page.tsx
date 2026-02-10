"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_SCORES = [
  { url: "stripe.com", score: 12, label: "Artisanally Crafted", emoji: "🏆" },
  { url: "linear.app", score: 18, label: "Artisanally Crafted", emoji: "🏆" },
  { url: "generic-saas.vercel.app", score: 87, label: "ChatGPT Sneezed On This", emoji: "💀" },
];

const STEPS = [
  {
    number: "01",
    title: "Paste a URL",
    description: "Drop any website URL into the scanner",
  },
  {
    number: "02",
    title: "We analyze everything",
    description: "DOM structure, CSS patterns, copy quality, visual design — all scored",
  },
  {
    number: "03",
    title: "Get your Slop Score",
    description: "0-100 rating with detailed breakdown and specific fixes",
  },
];

function ScoreColor({ score }: { score: number }) {
  if (score <= 20) return <span className="text-score-great">{score}</span>;
  if (score <= 40) return <span className="text-score-good">{score}</span>;
  if (score <= 60) return <span className="text-score-mid">{score}</span>;
  if (score <= 80) return <span className="text-score-bad">{score}</span>;
  return <span className="text-score-awful">{score}</span>;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const router = useRouter();

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setScanStatus("Taking screenshot...");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }

      setScanStatus("Analyzing patterns...");
      const data = await res.json();
      router.push(`/results/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setScanStatus("");
    }
  }

  return (
    <div className="grid-bg min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">
              slop<span className="text-accent">detector</span>
            </span>
          </div>
          <a
            href="https://github.com"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            How it works ↓
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 pt-32 pb-24">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            Free tool — no signup required
          </div>

          {/* Headline */}
          <h1 className="mb-6 max-w-3xl text-5xl leading-[1.1] font-extrabold tracking-tight sm:text-7xl">
            Is your website{" "}
            <span className="gradient-text">AI slop?</span>
          </h1>

          <p className="mb-12 max-w-xl text-lg leading-relaxed text-muted">
            Paste any URL. We&apos;ll scan the design, copy, and code for
            telltale signs of AI-generated mediocrity — then score it 0 to 100.
          </p>

          {/* URL Input */}
          <form
            onSubmit={handleScan}
            className="relative mb-6 w-full max-w-xl"
          >
            <div className="flex overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-black/20 transition-all focus-within:border-accent/50 focus-within:shadow-accent/5">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
                disabled={loading}
                className="flex-1 bg-transparent px-6 py-4 text-lg text-foreground placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="m-1.5 rounded-xl bg-accent px-8 py-3 font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Scanning
                  </span>
                ) : (
                  "Scan"
                )}
              </button>
            </div>
          </form>

          {/* Status / Error */}
          {loading && (
            <p className="scan-pulse mb-4 text-sm text-muted">{scanStatus}</p>
          )}
          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}

          <p className="text-xs text-zinc-600">
            5 free scans per day · No account needed
          </p>
        </div>

        {/* Example Scores */}
        <section className="mt-32">
          <h2 className="mb-2 text-center text-sm font-medium tracking-widest text-muted uppercase">
            Example Scores
          </h2>
          <p className="mb-12 text-center text-zinc-500">
            See how some sites stack up
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {EXAMPLE_SCORES.map((ex) => (
              <div
                key={ex.url}
                className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-zinc-700"
              >
                <div className="mb-4 text-sm text-muted">{ex.url}</div>
                <div className="mb-2 text-4xl font-black tabular-nums">
                  <ScoreColor score={ex.score} />
                  <span className="text-lg font-normal text-zinc-600">
                    /100
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>{ex.emoji}</span>
                  <span>{ex.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section id="how" className="mt-32">
          <h2 className="mb-2 text-center text-sm font-medium tracking-widest text-muted uppercase">
            How It Works
          </h2>
          <p className="mb-12 text-center text-zinc-500">
            Three layers of analysis, one score
          </p>

          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="mb-4 font-mono text-3xl font-black text-zinc-800">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Analysis layers */}
          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: "{ }",
                title: "DOM & CSS Analysis",
                items: [
                  "Tailwind default detection",
                  "ShadCN fingerprinting",
                  "Layout pattern matching",
                  "Font & color analysis",
                ],
              },
              {
                icon: "Aa",
                title: "Copy Analysis",
                items: [
                  "AI phrase detection",
                  "Em-dash density scoring",
                  "Filler metric detection",
                  "Fake testimonial spotting",
                ],
              },
              {
                icon: "◎",
                title: "Visual Analysis",
                items: [
                  "Screenshot analysis via AI",
                  "Color palette scoring",
                  "Layout originality rating",
                  "Imagery assessment",
                ],
              },
            ].map((layer) => (
              <div
                key={layer.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <div className="mb-3 font-mono text-2xl text-accent">
                  {layer.icon}
                </div>
                <h3 className="mb-3 font-semibold">{layer.title}</h3>
                <ul className="space-y-2">
                  {layer.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted"
                    >
                      <span className="mt-1.5 block h-1 w-1 rounded-full bg-zinc-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring rubric */}
        <section className="mt-32">
          <h2 className="mb-2 text-center text-sm font-medium tracking-widest text-muted uppercase">
            The Scale
          </h2>
          <p className="mb-12 text-center text-zinc-500">
            Where does your site land?
          </p>

          <div className="space-y-3">
            {[
              { range: "0–20", label: "Artisanally Crafted", emoji: "🏆", color: "bg-score-great", description: "Hand-crafted with taste and intention" },
              { range: "21–40", label: "Suspiciously Human", emoji: "👀", color: "bg-score-good", description: "Mostly original, minor template vibes" },
              { range: "41–60", label: "Template-Curious", emoji: "🤷", color: "bg-score-mid", description: "Default patterns are showing through" },
              { range: "61–80", label: "Peak AI Energy", emoji: "🤖", color: "bg-score-bad", description: "This was clearly AI-assisted with little customization" },
              { range: "81–100", label: "ChatGPT Sneezed On This", emoji: "💀", color: "bg-score-awful", description: "Maximum slop. The Tailwind defaults are calling" },
            ].map((tier) => (
              <div
                key={tier.range}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4"
              >
                <div className={`h-3 w-3 rounded-full ${tier.color}`} />
                <span className="w-16 font-mono text-sm text-muted">
                  {tier.range}
                </span>
                <span className="text-lg">{tier.emoji}</span>
                <span className="font-semibold">{tier.label}</span>
                <span className="ml-auto hidden text-sm text-muted sm:block">
                  {tier.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-32 border-t border-border pt-8 pb-12 text-center">
          <p className="text-sm text-zinc-600">
            Built by humans who are tired of every website looking the same.
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            Yes, we used Tailwind. No, the irony is not lost on us.
          </p>
        </footer>
      </main>
    </div>
  );
}
