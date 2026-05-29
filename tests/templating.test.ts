import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  buildVariables,
  firstNameFromHandle,
  extractPlaceholders,
  isFullyRendered,
} from "@/lib/templating";

describe("templating", () => {
  it("derives a first name from a handle", () => {
    expect(firstNameFromHandle("jane.doe_")).toBe("Jane");
    expect(firstNameFromHandle("fitwithjess")).toBe("Fitwithjess");
    expect(firstNameFromHandle("123")).toBe("there");
  });

  it("builds built-in variables", () => {
    const v = buildVariables("@Marco.Travels", { city: "Lisbon" });
    expect(v.handle).toBe("Marco.Travels");
    expect(v.firstName).toBe("Marco");
    expect(v.city).toBe("Lisbon");
  });

  it("renders placeholders and leaves unknowns untouched", () => {
    const out = renderTemplate("Hi {{firstName}}, from {{city}} re {{unknown}}", {
      firstName: "Jess",
      city: "NYC",
    });
    expect(out).toBe("Hi Jess, from NYC re {{unknown}}");
  });

  it("extracts placeholder names", () => {
    expect(extractPlaceholders("{{a}} {{ b }} {{a}}").sort()).toEqual(["a", "b"]);
  });

  it("detects fully renderable templates", () => {
    expect(isFullyRendered("Hi {{firstName}}", { firstName: "X" })).toBe(true);
    expect(isFullyRendered("Hi {{missing}}", { firstName: "X" })).toBe(false);
  });
});
