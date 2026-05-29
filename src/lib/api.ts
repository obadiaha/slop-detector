import { NextResponse } from "next/server";
import { authenticate, AuthError, type AuthContext } from "./auth";
import { ensureSeeded } from "./seed";

// ---------------------------------------------------------------------------
// API helpers — consistent auth, errors, and JSON shape for v1 routes.
// ---------------------------------------------------------------------------

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function err(status: number, message: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}

/**
 * Wrap a handler with seeding + API-key auth. The handler receives the parsed
 * AuthContext (client + key). Auth and unexpected errors become clean JSON.
 */
export function withAuth(
  handler: (req: Request, auth: AuthContext, params: Record<string, string>) => Promise<Response>,
) {
  return async (
    req: Request,
    ctx: { params?: Promise<Record<string, string>> },
  ): Promise<Response> => {
    ensureSeeded();
    try {
      const auth = authenticate(req);
      const params = (await ctx.params) ?? {};
      return await handler(req, auth, params);
    } catch (e) {
      if (e instanceof AuthError) return err(e.status, e.message);
      if (e instanceof SyntaxError) return err(400, "Invalid JSON body.");
      console.error("API error:", e);
      return err(500, (e as Error).message || "Internal error");
    }
  };
}

/** Parse a JSON body, tolerating an empty body as {}. */
export async function jsonBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}
