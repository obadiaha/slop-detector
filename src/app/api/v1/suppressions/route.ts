import { withAuth, ok, err, jsonBody } from "@/lib/api";
import * as store from "@/lib/store";
import { normalizeHandle } from "@/lib/compliance";

export const dynamic = "force-dynamic";

// GET /api/v1/suppressions — client-level do-not-contact list.
export const GET = withAuth(async (_req, auth) => {
  return ok({ suppressions: store.listSuppressions(auth.client.id) });
});

interface SuppressBody {
  handles?: string[];
  reason?: string;
}

// POST /api/v1/suppressions — add one or more handles to the suppression list.
export const POST = withAuth(async (req, auth) => {
  const body = await jsonBody<SuppressBody>(req);
  const handles = (body.handles ?? []).map(normalizeHandle).filter(Boolean);
  if (handles.length === 0) return err(400, "Provide a non-empty 'handles' array.");
  const added = handles.map((h) =>
    store.addSuppression(auth.client.id, h, body.reason ?? "api"),
  );
  return ok({ added, count: added.length }, 201);
});
