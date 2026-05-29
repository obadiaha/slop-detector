// ---------------------------------------------------------------------------
// Message personalization
//
// Templates use {{variable}} placeholders. Built-in variables are derived from
// the target (handle, firstName); any extra keys supplied on the target's
// `variables` map are also available. Unknown placeholders are left untouched
// so a missing variable is visible rather than silently dropped.
// ---------------------------------------------------------------------------

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Best-effort first name from a handle, e.g. "jane.doe_" -> "Jane". */
export function firstNameFromHandle(handle: string): string {
  const token = handle.replace(/^@/, "").split(/[._\d]/)[0] ?? "";
  if (!token) return "there";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export function buildVariables(
  handle: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  const normalized = handle.replace(/^@/, "");
  return {
    handle: normalized,
    firstName: firstNameFromHandle(normalized),
    ...extra,
  };
}

/** Render a template against a variable map. */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(PLACEHOLDER, (whole, key: string) => {
    const value = variables[key];
    return value === undefined ? whole : value;
  });
}

/** List the placeholder names used by a template. */
export function extractPlaceholders(template: string): string[] {
  const out = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) {
    out.add(match[1]);
  }
  return [...out];
}

/** True if every placeholder in the template resolves against `variables`. */
export function isFullyRendered(
  template: string,
  variables: Record<string, string>,
): boolean {
  return extractPlaceholders(template).every((k) => variables[k] !== undefined);
}
