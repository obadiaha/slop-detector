# 📨 InstaReach

**The HeyReach for Instagram DMs.** An API-first, managed Instagram creator
outreach platform: submit a list of profiles and a message template, and the
platform handles sending, deduplication, rate limits, sender-account health,
replies, and reporting.

> Built in response to the Graphed "Instagram Creator Outreach Platform" RFP.
> This repository is the **managed product / orchestration layer**. Actual
> Instagram message delivery sits behind a pluggable driver interface and ships
> with a realistic **simulation driver** so the entire workflow runs and is
> testable end-to-end without touching Instagram. See
> [What's real vs. simulated](#whats-real-vs-simulated).

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000  (dashboard + API)
pnpm test         # 27 unit/integration tests
pnpm build        # production build
```

The app seeds a demo workspace ("Acme Creators Agency") on first run, including
a development API key, sender accounts, two campaigns, and a suppression entry.

**Dev API key (sample data only):** `ir_live_demo00000000000000000000`

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/obadiaha/slop-detector/tree/claude/instagram-creator-outreach-6J6ZA)

Or from the CLI:

```bash
npm i -g vercel
vercel link          # connect to a Vercel project
vercel --prod        # deploy
```

### Durable storage (important)

Vercel's serverless filesystem is ephemeral, so the local file store won't
persist there. The data layer auto-detects a **Vercel KV / Upstash Redis**
backend and uses it when these env vars are present (set them in the Vercel
project → Settings → Environment Variables):

```
KV_REST_API_URL=https://<your>.upstash.io
KV_REST_API_TOKEN=<token>
# (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are also accepted)
```

Add a KV store with one click via **Vercel Dashboard → Storage → KV (Upstash)**;
Vercel injects those vars automatically. With no KV configured, the app still
runs but storage is in-memory and resets on cold start (fine for a quick demo,
flagged in the Settings page).

Other optional env vars:

```
INSTAREACH_WEBHOOK_SECRET=whsec_…   # HMAC secret for webhook signatures
INSTAREACH_DRIVER=simulation        # 'real' selects the (stubbed) prod driver
INSTAREACH_SEED=false               # skip demo seed data on a clean deploy
```

The `/api/health` endpoint reports the active driver and storage backend.

---

## The 60-second workflow

Exactly the experience described in the RFP:

```bash
KEY=ir_live_demo00000000000000000000

# 1. Create a campaign with targets + message (matches the RFP payload)
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": ["creator_one", "creator_two"],
    "message": "Hey {{firstName}} — loved your content. Would you be open to an affiliate partnership?",
    "campaign": "client_creator_outreach_may_2026"
  }'
# → { "campaign": { "id": "cmp_…" }, "ingest": { "accepted": 2, "skipped": {…} } }

# 2. Run the send queue (a background worker does this in production)
curl -X POST http://localhost:3000/api/v1/campaigns/cmp_…/start -H "Authorization: Bearer $KEY"

# 3. Pull replies (opt-outs auto-suppressed)
curl -X POST http://localhost:3000/api/v1/campaigns/cmp_…/poll-replies -H "Authorization: Bearer $KEY"

# 4. Retrieve results (JSON or CSV)
curl "http://localhost:3000/api/v1/campaigns/cmp_…/results?format=csv" -H "Authorization: Bearer $KEY"
```

---

## How it maps to the RFP

| RFP requirement | Where it lives |
| --- | --- |
| API-submit a list of profiles | `POST /api/v1/campaigns`, `POST /campaigns/:id/targets` |
| First-touch DM to each target | `processCampaign` engine → `SenderDriver.sendDm` |
| **Duplicate prevention** (client-wide) | `ingestTargets` → `clientContactedHandles` |
| Track sent/failed/skipped/replied | `Target.status` state machine |
| Export via dashboard / API / CSV / webhook | `/results`, `?format=csv`, webhook events, dashboard |
| Multiple campaigns & clients | every record is client-scoped; API keys pin a client |
| Webhooks for sent/failed/replied | signed `X-InstaReach-Signature` (HMAC-SHA256) |
| **Sender management** (limits, warmup, health, rotation) | `src/lib/senders/manager.ts` |
| Rate limits & throttling | per-campaign `dailyLimit` + `minSecondsBetweenSends`, per-sender caps |
| Opt-out handling | reply scanning → auto-suppression |
| Client-level suppression lists | `/api/v1/suppressions`, enforced at ingest |
| Message quality controls | `checkMessageQuality` gate on create/update |
| Follow-up sequences w/ branching | `Campaign.followUps` (`no_reply` / `always`) |
| Personalization variables | `{{handle}}`, `{{firstName}}`, custom vars |
| AI-assisted message generation | `POST /api/v1/ai/generate-message` |
| Analytics & account-health dashboard | dashboard pages under `/`, `/senders` |
| Reliability / observability | activity log, webhook event log, `/api/health` |

---

## API reference

All endpoints are under `/api/v1` and require `Authorization: Bearer <key>`
(or `X-API-Key`). Responses are JSON; errors are `{ "error": { "message": … } }`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/campaigns` | Create a campaign (idempotent by `campaign` name; re-posting appends targets). |
| `GET` | `/campaigns` | List campaigns with summary stats. |
| `GET` | `/campaigns/:id` | Campaign status + stats. |
| `PATCH` | `/campaigns/:id` | Update message, pause/resume, set webhook URL. |
| `POST` | `/campaigns/:id/targets` | Append targets. |
| `GET` | `/campaigns/:id/targets?status=` | List targets (optionally filtered). |
| `POST` | `/campaigns/:id/start` | Run the send queue (`{ drain, maxSends }`). |
| `POST` | `/campaigns/:id/poll-replies` | Fetch replies, auto-suppress opt-outs. |
| `GET` | `/campaigns/:id/results[?format=csv]` | Results as JSON or CSV. |
| `GET`/`POST` | `/senders` | List / register sender accounts. |
| `GET`/`POST` | `/suppressions` | List / add to the do-not-contact list. |
| `POST` | `/ai/generate-message` | Draft a compliant first-touch template. |
| `POST` | `/webhooks/test` | Send a signed test event to a URL. |
| `GET` | `/api/health` | Liveness + active driver. |

### Webhook events

When a campaign has a `webhookUrl`, the engine POSTs signed events:
`target.sent`, `target.failed`, `target.skipped`, `target.replied`,
`campaign.completed`.

Each request includes `X-InstaReach-Signature: t=<unix>,v1=<hmac>` where the
HMAC-SHA256 is computed over `${t}.${rawBody}`. Verify with
`verifySignature()` (`src/lib/webhooks.ts`) and your signing secret
(`INSTAREACH_WEBHOOK_SECRET`).

---

## Architecture

```
API routes / dashboard  ──▶  engine.ts  ──▶  SenderDriver (interface)
   (auth, validation)        (orchestration)      ├── SimulationDriver  ← default
                                  │               └── RealInstagramDriver ← stub
        store.ts (repositories)  ─┘
        db.ts (JSON persistence — swap for Postgres/SQLite behind read()/mutate())
```

- **Provider-agnostic orchestration.** Queueing, dedup, suppression, rate
  limits, warmup, retries, webhooks, and reporting know nothing about Instagram.
- **One seam to delivery.** `SenderDriver` (`sendDm`, `checkReplies`,
  `accountHealth`) is the only place that talks to a provider. Swapping drivers
  is one line in `getDriver()`.
- **Sender management** (`senders/manager.ts`): warmup ramp (5→50/day over a
  week), per-account daily caps, throttle spacing, load-balanced selection,
  health scoring, and automatic rotation of unhealthy accounts.

### What's real vs. simulated

| Real, production-grade | Simulated for the MVP |
| --- | --- |
| Campaign/target/sender data model & APIs | DM delivery outcome (success/fail/reply) |
| Dedup, suppression, opt-out, quality gates | Reply text generation |
| Rate limiting, warmup, throttle, rotation | Account-health probing |
| Webhook signing & delivery | — |
| CSV/JSON export, analytics | — |

The **`RealInstagramDriver` is an intentional, documented stub** (`src/lib/senders/real-stub.ts`).
Implementing reliable Instagram delivery — authenticated sender sessions, the
official messaging surface where eligible, session/proxy health, and
platform-change maintenance — is the operational work the RFP asks a vendor to
own. This repo deliberately contains **no scraping, login automation, or
anti-detection logic**; the orchestration layer above the driver already
enforces every compliance control, so a real driver only has to send one
message and report the result.

Set `INSTAREACH_DRIVER=real` to select it (it throws until implemented).

---

## Compliance & responsible use

InstaReach is built as a legitimate outreach tool:

- **No duplicate outreach** — client-wide dedup at ingest.
- **Suppression lists** — client-level do-not-contact, enforced everywhere.
- **Opt-out handling** — replies like "stop"/"not interested" auto-suppress.
- **Rate limits & throttling** — per-campaign and per-account, with warmup.
- **Message quality gate** — length checks, banned spammy phrasing, required
  personalization.

---

## Project layout

```
src/
  app/                 Dashboard pages + /api/v1 routes
  components/          UI primitives, sidebar, campaign form
  lib/
    engine.ts          Campaign execution engine (the core)
    senders/           SenderDriver interface, simulation + real-stub, manager
    store.ts           Client-scoped repositories
    db.ts              JSON persistence (read/mutate seam)
    compliance.ts      Handle hygiene, quality gate, opt-out detection
    templating.ts      {{variable}} rendering
    webhooks.ts        HMAC signing + delivery
    analytics.ts       Stats + CSV export
    ai.ts              Message generation
    seed.ts            Demo data
tests/                 vitest suite (engine, manager, compliance, templating, webhooks)
```

## Known limitations

- Persistence stores the whole DB as a single snapshot (JSON file locally, KV
  on serverless). It's ample for a pilot but not optimized for high-concurrency
  cross-instance writes — swap in a row-oriented store behind `db.ts` for scale.
- The execution engine runs in-process via the `/start` endpoint; production
  would move it to a durable background worker/queue (the seam is ready — the
  endpoint just calls `processCampaign`).
- Delivery is simulated — adopting the product for real campaigns requires a
  production `SenderDriver`.

## License

MIT
