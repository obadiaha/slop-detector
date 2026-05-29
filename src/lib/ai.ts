// ---------------------------------------------------------------------------
// AI-assisted message generation
//
// Exposed behind a clean function so a hosted LLM can be wired in later. When
// no provider is configured we fall back to a deterministic local generator
// that still produces a personalized, compliant first-touch template. This
// keeps the feature usable with zero external dependencies or keys.
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  /** What the outreach is about, e.g. "affiliate partnership for a skincare brand". */
  goal: string;
  /** Optional tone hint. */
  tone?: "friendly" | "professional" | "casual";
  /** Niche / audience descriptor for flavor, e.g. "fitness creators". */
  niche?: string;
}

const OPENERS: Record<string, string[]> = {
  friendly: ["Hey {{firstName}}! 👋", "Hi {{firstName}}!", "Hey {{firstName}} —"],
  professional: ["Hi {{firstName}},", "Hello {{firstName}},", "Hi {{firstName}} —"],
  casual: ["yo {{firstName}}!", "hey {{firstName}} :)", "hi {{firstName}}!"],
};

/** Generate a first-touch DM template. Always includes a personalization var. */
export function generateMessage(opts: GenerateOptions): string {
  const tone = opts.tone ?? "friendly";
  const opener = (OPENERS[tone] ?? OPENERS.friendly)[0];
  const nicheBit = opts.niche ? ` Your ${opts.niche} content really stands out` : " Really loved your recent content";
  return (
    `${opener}${nicheBit}. ` +
    `We're reaching out about ${opts.goal} and thought you'd be a great fit. ` +
    `Would you be open to chatting? No pressure either way!`
  );
}
