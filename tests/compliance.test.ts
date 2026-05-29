import { describe, it, expect } from "vitest";
import {
  normalizeHandle,
  isValidHandle,
  checkMessageQuality,
  isOptOut,
} from "@/lib/compliance";

describe("compliance", () => {
  it("normalizes handles from @, URLs, and casing", () => {
    expect(normalizeHandle("@FitWithJess")).toBe("fitwithjess");
    expect(normalizeHandle("https://instagram.com/marco.travels/")).toBe("marco.travels");
    expect(normalizeHandle("  Chef_Andre ")).toBe("chef_andre");
  });

  it("validates handle format", () => {
    expect(isValidHandle("good.handle_1")).toBe(true);
    expect(isValidHandle("has space")).toBe(false);
    expect(isValidHandle("bad!char")).toBe(false);
    expect(isValidHandle("")).toBe(false);
  });

  it("flags low-quality messages", () => {
    const codes = (m: string) => checkMessageQuality(m).map((i) => i.code);
    expect(codes("Hi {{firstName}}, loved your content!")).toEqual([]);
    expect(codes("hi")).toContain("too_short");
    expect(codes("Buy now {{firstName}}!!!")).toContain("banned_phrase");
    expect(codes("Generic message with no variable at all here")).toContain("no_personalization");
  });

  it("detects opt-out intent", () => {
    expect(isOptOut("Please STOP messaging me")).toBe(true);
    expect(isOptOut("not interested, thanks")).toBe(true);
    expect(isOptOut("unsubscribe")).toBe(true);
    expect(isOptOut("sure, tell me more!")).toBe(false);
  });
});
