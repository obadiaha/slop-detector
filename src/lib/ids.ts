import { randomBytes, randomUUID } from "node:crypto";

/** Short, prefixed, URL-safe id, e.g. "cmp_8f3a1b2c4d5e". */
export function id(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/** A raw API key shown exactly once to the integrator. */
export function rawApiKey(): string {
  // ir_live_<32 hex chars>
  return `ir_live_${randomBytes(16).toString("hex")}`;
}

export { randomUUID };
