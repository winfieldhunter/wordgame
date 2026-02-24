import { describe, it, expect } from "vitest";
import { formatShareText } from "@/lib/shareText";

describe("formatShareText", () => {
  it("formats with maxGuesses as X/Y", () => {
    const out = formatShareText({
      puzzleId: "daily-2026-02-22",
      guessCount: 6,
      maxGuesses: 8,
      bands: ["Cold", "Lukewarm", "Getting warm", "So close", "So close", "Bullseye"],
    });
    expect(out).toContain("NearWord #daily-2026-02-22");
    expect(out).toContain("6/8");
  });

  it("formats without maxGuesses as X guesses", () => {
    const out = formatShareText({
      puzzleId: "dev-0001",
      guessCount: 5,
      maxGuesses: null,
      bands: ["Lukewarm", "Getting warm", "Bullseye"],
    });
    expect(out).toContain("5 guesses");
  });
});
