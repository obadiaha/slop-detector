import { loadDb } from "./db";
import { listClients } from "./store";
import type { Client } from "./types";

// ---------------------------------------------------------------------------
// Dashboard session
//
// The dashboard is an internal operator view. For the MVP it operates on the
// first (demo) client rather than a logged-in user. A real deployment would
// resolve the workspace from an authenticated session here.
//
// Awaiting loadDb() guarantees the snapshot is hydrated (and seeded) before any
// synchronous store read — important on serverless where each cold start must
// rehydrate from the durable backend.
// ---------------------------------------------------------------------------

export async function getActiveClient(): Promise<Client> {
  await loadDb();
  return listClients()[0];
}
