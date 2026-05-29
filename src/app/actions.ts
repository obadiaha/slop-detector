"use server";

import { revalidatePath } from "next/cache";
import { getActiveClient } from "@/lib/session";
import * as store from "@/lib/store";
import { ingestTargets, processCampaign, pollCampaignReplies, type RawTarget } from "@/lib/engine";
import { checkMessageQuality } from "@/lib/compliance";
import { generateMessage } from "@/lib/ai";
import type { CampaignSettings } from "@/lib/types";

// ---------------------------------------------------------------------------
// Server actions for the dashboard. Each is scoped to the active client.
// ---------------------------------------------------------------------------

function parseHandles(raw: string): RawTarget[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((handle) => ({ handle }));
}

export async function createCampaignAction(formData: FormData): Promise<void> {
  const client = getActiveClient();
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const targetsRaw = String(formData.get("targets") ?? "");
  if (!name || !message) return;
  if (checkMessageQuality(message).length > 0) return;

  const senderIds = store
    .listSenders(client.id)
    .filter((s) => s.status === "active" || s.status === "warming")
    .map((s) => s.id);

  const settings: CampaignSettings = {
    dailyLimit: Number(formData.get("dailyLimit")) || 100,
    minSecondsBetweenSends: Number(formData.get("minSeconds")) || 60,
    maxAttempts: 3,
    senderIds,
  };

  const campaign = store.createCampaign({
    clientId: client.id,
    name,
    message,
    webhookUrl: String(formData.get("webhookUrl") ?? "").trim() || null,
    settings,
  });
  ingestTargets(campaign, parseHandles(targetsRaw));
  revalidatePath("/campaigns");
  revalidatePath("/");
}

export async function addTargetsAction(campaignId: string, formData: FormData): Promise<void> {
  const client = getActiveClient();
  const campaign = store.getCampaign(campaignId, client.id);
  if (!campaign) return;
  ingestTargets(campaign, parseHandles(String(formData.get("targets") ?? "")));
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function runCampaignAction(campaignId: string): Promise<void> {
  const client = getActiveClient();
  if (!store.getCampaign(campaignId, client.id)) return;
  await processCampaign(campaignId, { drain: true });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}

export async function pollRepliesAction(campaignId: string): Promise<void> {
  const client = getActiveClient();
  if (!store.getCampaign(campaignId, client.id)) return;
  await pollCampaignReplies(campaignId);
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
}

export async function pauseResumeAction(campaignId: string): Promise<void> {
  const client = getActiveClient();
  const campaign = store.getCampaign(campaignId, client.id);
  if (!campaign) return;
  if (campaign.status === "running") store.updateCampaign(campaignId, { status: "paused" });
  else if (campaign.status === "paused") store.updateCampaign(campaignId, { status: "running" });
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function addSenderAction(formData: FormData): Promise<void> {
  const client = getActiveClient();
  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "");
  if (!handle) return;
  store.createSender({
    clientId: client.id,
    handle,
    status: "warming",
    warmupDay: 0,
    maxDailyLimit: Number(formData.get("maxDailyLimit")) || 50,
    healthScore: 100,
    sentToday: 0,
    sentTodayDate: new Date().toISOString().slice(0, 10),
    lastSendAt: null,
    consecutiveFailures: 0,
  });
  revalidatePath("/senders");
}

export async function addSuppressionAction(formData: FormData): Promise<void> {
  const client = getActiveClient();
  const handles = String(formData.get("handles") ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  for (const h of handles) store.addSuppression(client.id, h, "dashboard");
  revalidatePath("/suppression");
}

export async function addTemplateAction(formData: FormData): Promise<void> {
  const client = getActiveClient();
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!name || !body) return;
  store.createTemplate(client.id, name, body);
  revalidatePath("/templates");
}

export async function generateMessageAction(goal: string): Promise<string> {
  return generateMessage({ goal });
}
