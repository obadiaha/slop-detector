import { createHash } from "node:crypto";
import { findApiKeyByHash, touchApiKey, getClient } from "./store";
import type { Client } from "./types";

// ---------------------------------------------------------------------------
// API-key authentication
//
// Keys are presented as a Bearer token. We hash the presented key and look it
// up; the raw key is never stored. A resolved key pins the request to exactly
// one client, which every repository query is scoped against.
// ---------------------------------------------------------------------------

export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export interface AuthContext {
  client: Client;
  apiKeyId: string;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Resolve the authenticated client from a request's Authorization header. */
export function authenticate(request: Request): AuthContext {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const raw = match?.[1]?.trim() ?? request.headers.get("x-api-key")?.trim();

  if (!raw) {
    throw new AuthError(401, "Missing API key. Send 'Authorization: Bearer <key>'.");
  }

  const apiKey = findApiKeyByHash(hashKey(raw));
  if (!apiKey) {
    throw new AuthError(401, "Invalid or revoked API key.");
  }

  const client = getClient(apiKey.clientId);
  if (!client) {
    throw new AuthError(401, "API key is not associated with a client.");
  }

  touchApiKey(apiKey.id);
  return { client, apiKeyId: apiKey.id };
}
