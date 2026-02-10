# 🔍 Slop Detector

**Is your website AI slop?** Paste any URL and get a 0–100 score analyzing AI-generated design patterns, copy clichés, and template fatigue.

**[Try it free →](https://godigitalapps.com/tools/slop-detector)**

## What It Detects

### DOM & CSS Analysis
- Tailwind default class detection (indigo-500 energy)
- ShadCN/UI component fingerprinting
- Cookie-cutter layout patterns (Hero → Features → Pricing → Testimonials → FAQ → CTA)
- 3-column grid detection
- Gradient cliché spotting

### Copy Analysis
- AI phrase detection ("revolutionize your workflow", "seamless integration")
- Em-dash density scoring (AI uses 3-5x more em-dashes than humans)
- Filler metric detection (unverifiable "10,000+ users" claims)
- Fake testimonial name spotting (Sarah Chen, Alex Rodriguez)
- Buzzword density analysis

### Typography
- Default AI font detection (Inter, system-ui, Roboto)
- Single-font-family detection
- Font pairing analysis

### Visual Design
- Generic gradient backgrounds
- Indigo/purple color scheme detection
- Card hover-lift patterns
- Missing favicon detection

## The Slop Scale

| Score | Label | Meaning |
|-------|-------|---------|
| 0–20 | 🏆 Artisanally Crafted | Hand-crafted with taste and intention |
| 21–40 | 👀 Suspiciously Human | Mostly original, minor template vibes |
| 41–60 | 🤷 Template-Curious | Default patterns showing through |
| 61–80 | 🤖 Peak AI Energy | Clearly AI-assisted, little customization |
| 81–100 | 💀 ChatGPT Sneezed On This | Maximum slop detected |

## Tech Stack

- **Next.js 14** — React framework
- **Tailwind CSS** — Styling
- **Server-side HTML parsing** — No Playwright needed, Vercel-compatible
- **Heuristic analysis engine** — Pattern matching across 100+ AI-slop signals

## Run Locally

```bash
git clone https://github.com/obadiaha/slop-detector.git
cd slop-detector
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Fetch** — Server-side HTTP fetch of the target URL's HTML
2. **Parse** — Extract CSS classes, text content, fonts, sections, and meta tags via regex parsing
3. **Analyze** — Run 5 analysis layers: Layout, Visual Design, Copy, Typography, Interactivity
4. **Score** — Weighted scoring across all categories produces a 0–100 slop score
5. **Report** — Detailed findings with severity levels and specific fix recommendations

## API

```bash
curl -X POST https://godigitalapps.com/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "example.com"}'
```

Returns a JSON object with the scan ID and full analysis result.

## Contributing

Found a new AI-slop pattern? PRs welcome. Add detection rules to:
- `lib/slop-detector/analyzer/dom-css.ts` — DOM/CSS patterns
- `lib/slop-detector/analyzer/copy.ts` — Copy/text patterns

## License

MIT

---

Built by [Go Digital Apps](https://godigitalapps.com) — tools for builders who ship.
