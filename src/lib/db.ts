import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Database } from "./types";

// ---------------------------------------------------------------------------
// Persistence
//
// The whole app reads through a synchronous in-memory snapshot. A pluggable
// async backend hydrates that snapshot at cold start (`loadDb`) and writes it
// back when dirty (`flushDb`). This keeps every consumer (routes, engine,
// server components) simple and sync, while supporting durable storage on
// serverless platforms where the filesystem is read-only/ephemeral.
//
// Backends, selected by environment:
//   - KV (Upstash / Vercel KV REST)  → when KV_REST_API_URL/TOKEN present
//   - File (local dev)               → when running outside a serverless host
//   - Memory (ephemeral)             → fallback (e.g. Vercel without KV)
//
// Snapshot model: the entire DB is stored under a single key. This is ample
// for a pilot; it trades cross-instance write concurrency for simplicity (see
// README "Known limitations"). Swap in a row-oriented store behind this seam
// for high-concurrency production use.
// ---------------------------------------------------------------------------

const DB_PATH = resolve(process.cwd(), "data", "db.json");
const KV_KEY = "instareach:db";

function emptyDb(): Database {
  return {
    clients: [],
    apiKeys: [],
    campaigns: [],
    targets: [],
    senders: [],
    suppressions: [],
    templates: [],
    webhookEvents: [],
    activity: [],
  };
}

interface Backend {
  readonly name: string;
  load(): Promise<Database | null>;
  save(db: Database): Promise<void>;
}

// ---- File backend (local development) -------------------------------------

const fileBackend: Backend = {
  name: "file",
  async load() {
    if (!existsSync(DB_PATH)) return null;
    try {
      return JSON.parse(readFileSync(DB_PATH, "utf8")) as Database;
    } catch {
      return null;
    }
  },
  async save(db) {
    try {
      mkdirSync(dirname(DB_PATH), { recursive: true });
      writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch {
      /* read-only fs */
    }
  },
};

// ---- KV backend (Upstash / Vercel KV REST) --------------------------------

function kvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function kvBackend(cfg: { url: string; token: string }): Backend {
  const headers = { Authorization: `Bearer ${cfg.token}` };
  return {
    name: "kv",
    async load() {
      try {
        const res = await fetch(`${cfg.url}/get/${KV_KEY}`, { headers, cache: "no-store" });
        if (!res.ok) return null;
        const body = (await res.json()) as { result: string | null };
        return body.result ? (JSON.parse(body.result) as Database) : null;
      } catch {
        return null;
      }
    },
    async save(db) {
      try {
        await fetch(`${cfg.url}/set/${KV_KEY}`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(db),
        });
      } catch {
        /* best effort */
      }
    },
  };
}

// ---- Memory backend (ephemeral fallback) ----------------------------------

const memoryBackend: Backend = {
  name: "memory",
  async load() {
    return null;
  },
  async save() {},
};

function selectBackend(): Backend {
  const kv = kvConfig();
  if (kv) return kvBackend(kv);
  // On a serverless host without KV, the filesystem isn't durable.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return memoryBackend;
  return fileBackend;
}

// ---------------------------------------------------------------------------
// In-memory snapshot + lifecycle. `globalThis` survives Next.js hot reloads
// and is shared within a single serverless instance.
// ---------------------------------------------------------------------------

interface DbGlobal {
  snapshot?: Database;
  loaded?: boolean;
  dirty?: boolean;
  backend?: Backend;
}
const g = globalThis as unknown as { __instareach?: DbGlobal };
g.__instareach ??= {};
const state = g.__instareach;

function backend(): Backend {
  return (state.backend ??= selectBackend());
}

export function activeBackendName(): string {
  return backend().name;
}

function memory(): Database {
  return (state.snapshot ??= emptyDb());
}

/** Read-only snapshot. Callers must have awaited loadDb() at their entry point. */
export function read(): Database {
  return memory();
}

/** Apply a mutation to the in-memory snapshot and mark it dirty. */
export function mutate<T>(fn: (db: Database) => T): T {
  const result = fn(memory());
  state.dirty = true;
  return result;
}

/** Replace the entire snapshot (seeding / tests). Marks dirty. */
export function replaceAll(db: Database): void {
  state.snapshot = db;
  state.dirty = true;
}

/**
 * Hydrate the snapshot from the backend once per instance, seeding demo data
 * when empty. Idempotent and safe to call at the top of every request.
 */
export async function loadDb(): Promise<void> {
  if (state.loaded) return;
  const loaded = await backend().load();
  if (loaded) {
    state.snapshot = { ...emptyDb(), ...loaded };
    state.dirty = false;
  } else {
    state.snapshot = emptyDb();
    state.dirty = false;
  }
  state.loaded = true;

  // Seed demo data on first run (disable with INSTAREACH_SEED=false).
  if (state.snapshot.clients.length === 0 && process.env.INSTAREACH_SEED !== "false") {
    const { seed } = await import("./seed");
    seed();
    await flushDb();
  }
}

/** Persist the snapshot to the backend if it has unsaved changes. */
export async function flushDb(): Promise<void> {
  if (!state.dirty || !state.snapshot) return;
  await backend().save(state.snapshot);
  state.dirty = false;
}

/** Reset in-memory state (tests only). */
export function __resetForTests(db?: Database): void {
  state.snapshot = db ?? emptyDb();
  state.loaded = true;
  state.dirty = false;
  state.backend = memoryBackend;
}
