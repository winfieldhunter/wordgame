import { describe, it, expect } from "vitest";
import { computePCA } from "@/server/projection/pca";

describe("computePCA", () => {
  it("returns same output for same input (deterministic)", () => {
    const vectors = [
      [1, 2, 3],
      [2, 3, 4],
      [1, 1, 1],
      [4, 5, 6],
    ];
    const a = computePCA(vectors);
    const b = computePCA(vectors);
    expect(a.points.length).toBe(b.points.length);
    a.points.forEach((p, i) => {
      expect(p.x).toBe(b.points[i].x);
      expect(p.y).toBe(b.points[i].y);
    });
  });

  it("handles empty input", () => {
    const out = computePCA([]);
    expect(out.points).toEqual([]);
  });
});
