import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  percentileFromSorted,
  computeScore,
  checkWin,
  checkLoss,
} from "@/server/scoring/scoring";
import { getBandFromScore, cosineToScore100, COS_MIN, COS_MAX } from "@/server/scoring/types";
import { defaultGameConfig } from "@/config/gameConfig";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBe(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("is symmetric", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(cosineSimilarity(a, b)).toBe(cosineSimilarity(b, a));
  });
});

describe("percentileFromSorted", () => {
  const sorted = [
    { word: "a", cosine: 0.9 },
    { word: "b", cosine: 0.7 },
    { word: "c", cosine: 0.5 },
    { word: "d", cosine: 0.3 },
  ];

  it("gives high percentile for high cosine", () => {
    expect(percentileFromSorted(0.95, sorted)).toBeGreaterThan(90);
  });

  it("gives low percentile for low cosine", () => {
    expect(percentileFromSorted(0.2, sorted)).toBeLessThan(30);
  });

  it("is deterministic", () => {
    expect(percentileFromSorted(0.5, sorted)).toBe(percentileFromSorted(0.5, sorted));
  });
});

describe("checkWin", () => {
  it("returns true for exact match", () => {
    expect(checkWin("peace", "peace", null, defaultGameConfig)).toBe(true);
  });

  it("returns true for percentile >= winPercentile", () => {
    expect(checkWin("calm", "peace", 99.5, defaultGameConfig)).toBe(true);
  });

  it("returns false otherwise", () => {
    expect(checkWin("chaos", "peace", 10, defaultGameConfig)).toBe(false);
  });
});

describe("checkLoss", () => {
  it("returns true when at or over maxGuesses", () => {
    expect(checkLoss(8, 8)).toBe(true);
    expect(checkLoss(9, 8)).toBe(true);
  });

  it("returns false when under or maxGuesses null", () => {
    expect(checkLoss(7, 8)).toBe(false);
    expect(checkLoss(100, null)).toBe(false);
  });
});

describe("cosineToScore100 (calibrated mapping)", () => {
  it("maps cos below COS_MIN to 0", () => {
    expect(cosineToScore100(0)).toBe(0);
    expect(cosineToScore100(COS_MIN - 0.01)).toBe(0);
    expect(cosineToScore100(0.05)).toBe(0);
  });

  it("maps cos above COS_MAX to 100", () => {
    expect(cosineToScore100(COS_MAX + 0.01)).toBe(100);
    expect(cosineToScore100(0.6)).toBe(100);
    expect(cosineToScore100(1)).toBe(100);
  });

  it("maps cos at COS_MIN to 0 and at COS_MAX to 100", () => {
    expect(cosineToScore100(COS_MIN)).toBe(0);
    expect(cosineToScore100(COS_MAX)).toBe(100);
  });

  it("maps mid-range linearly (0.30 => 50)", () => {
    expect(cosineToScore100(0.3)).toBeCloseTo(50, 10); // (0.3 - 0.1) / 0.4 = 0.5 => 50
  });
});

describe("getBandFromScore (cosine-only mode)", () => {
  const bands = defaultGameConfig.feedbackBands;

  it("uses calibrated score100 when scoreMode is cosine (no percentile)", () => {
    expect(getBandFromScore(0.05, null, bands, "cosine").label).toBe("Freezing"); // score100 0
    expect(getBandFromScore(0.1, null, bands, "cosine").label).toBe("Freezing"); // score100 0
    expect(getBandFromScore(0.5, null, bands, "cosine").label).toBe("Scorching"); // score100 100
    expect(getBandFromScore(0.6, null, bands, "cosine").label).toBe("Scorching"); // score100 100
    expect(getBandFromScore(0.3, null, bands, "cosine").label).toBe("Cool"); // score100 50 => Cool (min 42)
  });

  it("uses calibrated score100 when percentile is null in both mode (cosine-only fallback)", () => {
    expect(getBandFromScore(0.5, null, bands, "both").label).toBe("Scorching");
    expect(getBandFromScore(0.3, null, bands, "both").label).toBe("Cool"); // 50
  });

  it("returns a valid band for any cosine in [0,1] when percentile is null", () => {
    for (const scoreMode of ["cosine", "both"] as const) {
      expect(getBandFromScore(0, null, bands, scoreMode).label).toBeDefined();
      expect(getBandFromScore(1, null, bands, scoreMode).label).toBeDefined();
      expect(getBandFromScore(0.3, null, bands, scoreMode).label).toBeDefined();
    }
  });
});

describe("computeScore (cosine-only: no distribution)", () => {
  it("returns valid band and percentileUnavailable when sortedDistribution is null", () => {
    const emb = [0.1, 0.2, 0.3];
    const result = computeScore({
      guessEmbedding: emb,
      targetEmbedding: emb,
      sortedDistribution: null,
      config: defaultGameConfig,
    });
    expect(result.cosine).toBe(1);
    expect(result.percentile).toBeNull();
    expect(result.percentileUnavailable).toBe(true);
    expect(result.band.label).toBeDefined();
    expect(result.band.label).toBe("Scorching"); // cosine 1 => score100 100 => top band (Bullseye is API-only for exact match)
  });

  it("returns band from cosine when sortedDistribution is empty array", () => {
    const result = computeScore({
      guessEmbedding: [1, 0, 0],
      targetEmbedding: [0.8, 0.2, 0],
      sortedDistribution: [],
      config: defaultGameConfig,
    });
    expect(result.percentile).toBeNull();
    expect(result.percentileUnavailable).toBe(true);
    expect(result.band.label).toBeDefined();
  });
});
