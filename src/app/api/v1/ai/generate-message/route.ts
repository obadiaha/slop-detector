import { withAuth, ok, err, jsonBody } from "@/lib/api";
import { generateMessage, type GenerateOptions } from "@/lib/ai";
import { checkMessageQuality } from "@/lib/compliance";

export const dynamic = "force-dynamic";

// POST /api/v1/ai/generate-message — draft a compliant first-touch template.
export const POST = withAuth(async (req) => {
  const body = await jsonBody<Partial<GenerateOptions>>(req);
  if (!body.goal?.trim()) return err(400, "Field 'goal' is required.");
  const message = generateMessage({
    goal: body.goal.trim(),
    tone: body.tone,
    niche: body.niche,
  });
  return ok({ message, issues: checkMessageQuality(message) });
});
