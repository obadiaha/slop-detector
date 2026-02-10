import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function getScoreColor(score: number): string {
  if (score <= 20) return "#10b981";
  if (score <= 40) return "#22d3ee";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#f97316";
  return "#ef4444";
}

function getRatingLabel(score: number): { label: string; emoji: string } {
  if (score <= 20) return { label: "Artisanally Crafted", emoji: "🏆" };
  if (score <= 40) return { label: "Suspiciously Human", emoji: "👀" };
  if (score <= 60) return { label: "Template-Curious", emoji: "🤷" };
  if (score <= 80) return { label: "Peak AI Energy", emoji: "🤖" };
  return { label: "ChatGPT Sneezed On This", emoji: "💀" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const score = parseInt(searchParams.get("score") || "50", 10);
  const url = searchParams.get("url") || "example.com";
  const color = getScoreColor(score);
  const { label, emoji } = getRatingLabel(score);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background noise */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(120,119,198,0.15), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,99,71,0.1), transparent 50%)",
            display: "flex",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "28px", color: "#71717a" }}>
            slopdetector.com
          </span>
        </div>

        {/* Score */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "160px",
              fontWeight: 900,
              color: color,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: "48px",
              color: "#71717a",
              fontWeight: 300,
            }}
          >
            /100
          </span>
        </div>

        {/* Label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "40px" }}>{emoji}</span>
          <span
            style={{
              fontSize: "36px",
              color: "#e4e4e7",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
        </div>

        {/* URL */}
        <div
          style={{
            display: "flex",
            padding: "12px 24px",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span
            style={{
              fontSize: "24px",
              color: "#a1a1aa",
            }}
          >
            {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "20px", color: "#52525b" }}>
            Is your website AI slop? Find out →
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
