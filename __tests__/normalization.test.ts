import { describe, it, expect } from "vitest";
import { normalizeGuess, ValidationError } from "@/server/scoring/normalization";

describe("normalizeGuess", () => {
  const opts = { allowPhrases: true, maxInputChars: 40 };

  it("lowercases and trims", () => {
    expect(normalizeGuess("  PEACE  ", opts)).toBe("peace");
  });

  it("collapses whitespace", () => {
    expect(normalizeGuess("peace   and   quiet", opts)).toBe("peace and quiet");
  });

  it("rejects empty", () => {
    expect(() => normalizeGuess("", opts)).toThrow(ValidationError);
    expect(() => normalizeGuess("   ", opts)).toThrow(ValidationError);
  });

  it("rejects when no phrases and input has space", () => {
    expect(() =>
      normalizeGuess("peace and quiet", { ...opts, allowPhrases: false })
    ).toThrow(ValidationError);
  });

  it("rejects over maxInputChars", () => {
    expect(() =>
      normalizeGuess("a".repeat(41), opts)
    ).toThrow(ValidationError);
  });

  it("rejects digits", () => {
    expect(() => normalizeGuess("peace2", opts)).toThrow(ValidationError);
  });

  it("allows apostrophe and hyphen", () => {
    expect(normalizeGuess("don't", opts)).toBe("don't");
    expect(normalizeGuess("well-being", opts)).toBe("well-being");
  });
});
