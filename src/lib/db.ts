import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Database } from "./types";

// ---------------------------------------------------------------------------
// Persistence
//
// For the MVP we use a single JSON file as the system of record, fronted by an
// in-memory cache and a write-through. The whole surface goes through the
// `read()` / `mutate()` pair below, so swapping in Postgres/SQLite later is a
// localized change — nothing else in the codebase touches the file.
//
// `mutate()` is synchronous and serialized within a single Node process, which
// is enough to keep the demo's queue processing consistent. The repository
// pattern (store.ts) is the only consumer.
// ---------------------------------------------------------------------------

const DB_PATH = resolve(process.cwd(), "data", "db.json");

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

// Cache the parsed DB on the module so repeated requests in the same process
// don't re-read the file. `globalThis` survives Next.js dev hot-reloads.
const globalForDb = globalThis as unknown as { __instareachDb?: Database };

function load(): Database {
  if (globalForDb.__instareachDb) return globalForDb.__instareachDb;

  let db: Database;
  if (existsSync(DB_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(DB_PATH, "utf8")) as Partial<Database>;
      // Merge against an empty db so newly-added tables are always present.
      db = { ...emptyDb(), ...parsed };
    } catch {
      db = emptyDb();
    }
  } else {
    db = emptyDb();
  }
  globalForDb.__instareachDb = db;
  return db;
}

function persist(db: Database): void {
  // Tests and serverless read-only filesystems may not allow writes; never let
  // a persistence failure crash a request — the in-memory copy stays correct.
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    /* in-memory only */
  }
}

/** Read-only snapshot of the database. Do not mutate the result. */
export function read(): Database {
  return load();
}

/** Apply a mutation and write-through to disk. Returns the function's result. */
export function mutate<T>(fn: (db: Database) => T): T {
  const db = load();
  const result = fn(db);
  persist(db);
  return result;
}

/** Replace the entire database (used by seeding and tests). */
export function replaceAll(db: Database): void {
  globalForDb.__instareachDb = db;
  persist(db);
}

/** Reset the in-memory cache (tests only). */
export function __resetForTests(db?: Database): void {
  globalForDb.__instareachDb = db ?? emptyDb();
}
