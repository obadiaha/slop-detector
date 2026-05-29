// ---------------------------------------------------------------------------
// Compliance & responsible-use controls
//
// InstaReach is a legitimate outreach product, not a spam tool. These helpers
// enforce that posture: handle hygiene, message-quality gates, and opt-out
// detection. Suppression-list and duplicate checks live in the engine where
// they have database access.
// ---------------------------------------------------------------------------

/** Instagram usernames: letters, numbers, periods, underscores, 1–30 chars. */
const HANDLE_RE = /^[a-z0-9._]{1,30}$/;

/** Normalize a user-supplied handle: strip @, URL, whitespace; lowercase. */
export function normalizeHandle(input: string): string {
  let h = input.trim().toLowerCase();
  // Accept full profile URLs.
  const urlMatch = h.match(/instagram\.com\/([a-z0-9._]+)/);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, "").replace(/\/+$/, "");
  return h;
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

export interface QualityIssue {
  code: string;
  message: string;
}

/** Default phrases that read as low-quality / spammy first touches. */
const BANNED_SUBSTRINGS = [
  "click here",
  "buy now",
  "100% guaranteed",
  "act now",
  "limited time offer",
  "make money fast",
  "free money",
];

export interface QualityOptions {
  minLength?: number;
  maxLength?: number;
  /** Require at least one personalization placeholder in the template. */
  requirePersonalization?: boolean;
}

/**
 * Validate a message *template* (before rendering). Returns the list of issues;
 * an empty list means the message passes the quality gate.
 */
export function checkMessageQuality(
  template: string,
  options: QualityOptions = {},
): QualityIssue[] {
  const {
    minLength = 10,
    maxLength = 900, // Instagram DMs cap ~1000; leave headroom for rendering.
    requirePersonalization = true,
  } = options;

  const issues: QualityIssue[] = [];
  const trimmed = template.trim();

  if (trimmed.length < minLength) {
    issues.push({ code: "too_short", message: `Message must be at least ${minLength} characters.` });
  }
  if (trimmed.length > maxLength) {
    issues.push({ code: "too_long", message: `Message must be at most ${maxLength} characters.` });
  }

  const lower = trimmed.toLowerCase();
  for (const phrase of BANNED_SUBSTRINGS) {
    if (lower.includes(phrase)) {
      issues.push({ code: "banned_phrase", message: `Avoid spammy phrasing: "${phrase}".` });
    }
  }

  if (requirePersonalization && !/\{\{\s*[\w.]+\s*\}\}/.test(template)) {
    issues.push({
      code: "no_personalization",
      message: "Message should include at least one personalization variable, e.g. {{firstName}}.",
    });
  }

  return issues;
}

const OPT_OUT_PATTERNS = [
  /\bstop\b/i,
  /\bunsubscribe\b/i,
  /\bremove me\b/i,
  /\bdon'?t (message|contact|dm) me\b/i,
  /\bnot interested\b/i,
  /\bleave me alone\b/i,
];

/** Detect an opt-out intent in a reply so the engine can suppress the handle. */
export function isOptOut(replyText: string): boolean {
  return OPT_OUT_PATTERNS.some((re) => re.test(replyText));
}
