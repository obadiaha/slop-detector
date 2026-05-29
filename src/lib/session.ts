import { ensureSeeded } from "./seed";
import { listClients } from "./store";
import type { Client } from "./types";

// ---------------------------------------------------------------------------
// Dashboard session
//
// The dashboard is an internal operator view. For the MVP it operates on the
// first (demo) client rather than a logged-in user. A real deployment would
// resolve the workspace from an authenticated session here.
// ---------------------------------------------------------------------------

export function getActiveClient(): Client {
  ensureSeeded();
  const clients = listClients();
  return clients[0];
}
