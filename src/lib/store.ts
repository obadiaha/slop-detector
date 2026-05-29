import { read, mutate } from "./db";
import { id } from "./ids";
import type {
  Client,
  ApiKey,
  Campaign,
  Target,
  SenderAccount,
  Suppression,
  Template,
  WebhookEvent,
  ActivityEvent,
  CampaignSettings,
} from "./types";

// ---------------------------------------------------------------------------
// Repositories
//
// Thin, typed accessors over the JSON store. Every query is client-scoped where
// it makes sense so the API layer can't accidentally leak cross-tenant data.
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString();

// ---- Clients --------------------------------------------------------------

export function listClients(): Client[] {
  return read().clients;
}

export function getClient(clientId: string): Client | undefined {
  return read().clients.find((c) => c.id === clientId);
}

export function createClient(name: string): Client {
  const client: Client = { id: id("cli"), name, createdAt: now() };
  mutate((db) => db.clients.push(client));
  return client;
}

// ---- API keys -------------------------------------------------------------

export function listApiKeys(clientId: string): ApiKey[] {
  return read().apiKeys.filter((k) => k.clientId === clientId);
}

export function createApiKey(key: Omit<ApiKey, "id">): ApiKey {
  const record: ApiKey = { ...key, id: id("key") };
  mutate((db) => db.apiKeys.push(record));
  return record;
}

export function findApiKeyByHash(hash: string): ApiKey | undefined {
  return read().apiKeys.find((k) => k.hash === hash && !k.revokedAt);
}

export function touchApiKey(keyId: string): void {
  mutate((db) => {
    const k = db.apiKeys.find((x) => x.id === keyId);
    if (k) k.lastUsedAt = now();
  });
}

export function revokeApiKey(keyId: string, clientId: string): void {
  mutate((db) => {
    const k = db.apiKeys.find((x) => x.id === keyId && x.clientId === clientId);
    if (k) k.revokedAt = now();
  });
}

// ---- Campaigns ------------------------------------------------------------

export function listCampaigns(clientId: string): Campaign[] {
  return read().campaigns.filter((c) => c.clientId === clientId);
}

export function getCampaign(campaignId: string, clientId?: string): Campaign | undefined {
  return read().campaigns.find(
    (c) => c.id === campaignId && (clientId === undefined || c.clientId === clientId),
  );
}

/** Look up a campaign by its client-supplied name (used for idempotent create). */
export function getCampaignByName(clientId: string, name: string): Campaign | undefined {
  return read().campaigns.find((c) => c.clientId === clientId && c.name === name);
}

export interface CreateCampaignInput {
  clientId: string;
  name: string;
  message: string;
  settings: CampaignSettings;
  webhookUrl: string | null;
  followUps?: Campaign["followUps"];
}

export function createCampaign(input: CreateCampaignInput): Campaign {
  const campaign: Campaign = {
    id: id("cmp"),
    clientId: input.clientId,
    name: input.name,
    status: "draft",
    message: input.message,
    followUps: input.followUps ?? [],
    settings: input.settings,
    webhookUrl: input.webhookUrl,
    createdAt: now(),
    startedAt: null,
    completedAt: null,
  };
  mutate((db) => db.campaigns.push(campaign));
  return campaign;
}

export function updateCampaign(
  campaignId: string,
  patch: Partial<Campaign>,
): Campaign | undefined {
  return mutate((db) => {
    const c = db.campaigns.find((x) => x.id === campaignId);
    if (!c) return undefined;
    Object.assign(c, patch);
    return c;
  });
}

// ---- Targets --------------------------------------------------------------

export function listTargets(campaignId: string): Target[] {
  return read().targets.filter((t) => t.campaignId === campaignId);
}

export function getTarget(targetId: string): Target | undefined {
  return read().targets.find((t) => t.id === targetId);
}

/** All handles ever queued for a client (for cross-campaign dedup). */
export function clientContactedHandles(clientId: string): Set<string> {
  const handles = new Set<string>();
  for (const t of read().targets) {
    if (t.clientId === clientId && t.status !== "skipped") handles.add(t.handle);
  }
  return handles;
}

export function addTargets(targets: Target[]): void {
  if (targets.length === 0) return;
  mutate((db) => db.targets.push(...targets));
}

export function updateTarget(targetId: string, patch: Partial<Target>): Target | undefined {
  return mutate((db) => {
    const t = db.targets.find((x) => x.id === targetId);
    if (!t) return undefined;
    Object.assign(t, patch);
    return t;
  });
}

// ---- Senders --------------------------------------------------------------

export function listSenders(clientId: string): SenderAccount[] {
  return read().senders.filter((s) => s.clientId === clientId);
}

export function getSendersByIds(ids: string[]): SenderAccount[] {
  const set = new Set(ids);
  return read().senders.filter((s) => set.has(s.id));
}

export function createSender(
  sender: Omit<SenderAccount, "id" | "createdAt">,
): SenderAccount {
  const record: SenderAccount = { ...sender, id: id("snd"), createdAt: now() };
  mutate((db) => db.senders.push(record));
  return record;
}

export function updateSender(
  senderId: string,
  patch: Partial<SenderAccount>,
): SenderAccount | undefined {
  return mutate((db) => {
    const s = db.senders.find((x) => x.id === senderId);
    if (!s) return undefined;
    Object.assign(s, patch);
    return s;
  });
}

/** Persist the full state of a sender (used by the engine after policy changes). */
export function saveSender(sender: SenderAccount): void {
  mutate((db) => {
    const idx = db.senders.findIndex((s) => s.id === sender.id);
    if (idx >= 0) db.senders[idx] = sender;
  });
}

// ---- Suppressions ---------------------------------------------------------

export function listSuppressions(clientId: string): Suppression[] {
  return read().suppressions.filter((s) => s.clientId === clientId);
}

export function suppressedHandles(clientId: string): Set<string> {
  return new Set(listSuppressions(clientId).map((s) => s.handle));
}

export function addSuppression(clientId: string, handle: string, reason: string): Suppression {
  const existing = read().suppressions.find(
    (s) => s.clientId === clientId && s.handle === handle,
  );
  if (existing) return existing;
  const record: Suppression = { id: id("sup"), clientId, handle, reason, createdAt: now() };
  mutate((db) => db.suppressions.push(record));
  return record;
}

// ---- Templates ------------------------------------------------------------

export function listTemplates(clientId: string): Template[] {
  return read().templates.filter((t) => t.clientId === clientId);
}

export function createTemplate(clientId: string, name: string, body: string): Template {
  const record: Template = { id: id("tpl"), clientId, name, body, createdAt: now() };
  mutate((db) => db.templates.push(record));
  return record;
}

// ---- Webhook events -------------------------------------------------------

export function recordWebhookEvent(event: Omit<WebhookEvent, "id">): WebhookEvent {
  const record: WebhookEvent = { ...event, id: id("evt") };
  mutate((db) => db.webhookEvents.push(record));
  return record;
}

export function updateWebhookEvent(eventId: string, patch: Partial<WebhookEvent>): void {
  mutate((db) => {
    const e = db.webhookEvents.find((x) => x.id === eventId);
    if (e) Object.assign(e, patch);
  });
}

export function listWebhookEvents(campaignId: string): WebhookEvent[] {
  return read().webhookEvents.filter((e) => e.campaignId === campaignId);
}

// ---- Activity log ---------------------------------------------------------

export function logActivity(
  clientId: string,
  campaignId: string | null,
  level: ActivityEvent["level"],
  message: string,
): void {
  const record: ActivityEvent = {
    id: id("act"),
    clientId,
    campaignId,
    level,
    message,
    createdAt: now(),
  };
  mutate((db) => {
    db.activity.push(record);
    // Keep the log bounded.
    if (db.activity.length > 2000) db.activity.splice(0, db.activity.length - 2000);
  });
}

export function listActivity(clientId: string, limit = 100): ActivityEvent[] {
  return read()
    .activity.filter((a) => a.clientId === clientId)
    .slice(-limit)
    .reverse();
}
