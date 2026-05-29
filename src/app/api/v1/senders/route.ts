import { withAuth, ok, err, jsonBody } from "@/lib/api";
import * as store from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/v1/senders — list the client's sender accounts + health.
export const GET = withAuth(async (_req, auth) => {
  return ok({ senders: store.listSenders(auth.client.id) });
});

interface CreateSenderBody {
  handle?: string;
  maxDailyLimit?: number;
}

// POST /api/v1/senders — register a sender account (starts in warmup).
export const POST = withAuth(async (req, auth) => {
  const body = await jsonBody<CreateSenderBody>(req);
  const handle = body.handle?.trim().replace(/^@/, "");
  if (!handle) return err(400, "Field 'handle' is required.");
  const sender = store.createSender({
    clientId: auth.client.id,
    handle,
    status: "warming",
    warmupDay: 0,
    maxDailyLimit: body.maxDailyLimit ?? 50,
    healthScore: 100,
    sentToday: 0,
    sentTodayDate: new Date().toISOString().slice(0, 10),
    lastSendAt: null,
    consecutiveFailures: 0,
  });
  return ok({ sender }, 201);
});
