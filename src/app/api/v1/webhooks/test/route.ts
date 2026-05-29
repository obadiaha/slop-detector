import { withAuth, ok, err, jsonBody } from "@/lib/api";
import { deliverWebhook, signPayload } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

interface TestBody {
  url?: string;
}

// POST /api/v1/webhooks/test — send a signed sample event to verify a receiver.
export const POST = withAuth(async (req, auth) => {
  const body = await jsonBody<TestBody>(req);
  if (!body.url) return err(400, "Field 'url' is required.");
  const payload = {
    type: "webhook.test" as const,
    clientId: auth.client.id,
    message: "If you can verify this signature, your endpoint is configured correctly.",
    sentAt: new Date().toISOString(),
  };
  const result = await deliverWebhook(body.url, payload);
  return ok({
    result,
    signatureHeader: "X-InstaReach-Signature",
    exampleSignature: signPayload(JSON.stringify(payload)),
  });
});
