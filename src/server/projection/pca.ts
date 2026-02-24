/**
 * Deterministic 2D PCA projection. Same vectors -> same output.
 * Center, compute top 2 principal components via SVD, project.
 */

export interface Point2D {
  x: number;
  y: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function subtract(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (n === 0) return v;
  return v.map((x) => x / n);
}

/**
 * Simple power iteration for largest eigenvector of X'X (covariance).
 * Deterministic, no random seed.
 */
function topEigenvector(vectors: number[][], dim: number): number[] {
  const n = vectors.length;
  if (n === 0) return new Array(dim).fill(0);
  let v = new Array(dim).fill(1 / Math.sqrt(dim));
  for (let iter = 0; iter < 50; iter++) {
    const w = new Array(dim).fill(0);
    for (const x of vectors) {
      const c = dot(x, v);
      for (let i = 0; i < dim; i++) w[i] += c * x[i];
    }
    v = normalize(w);
  }
  return v;
}

/**
 * Project vectors onto the plane perpendicular to given unit vector.
 */
function projectOut(vectors: number[][], unit: number[]): number[][] {
  return vectors.map((x) => {
    const c = dot(x, unit);
    return x.map((v, i) => v - c * unit[i]);
  });
}

export interface PCAResult {
  points: Point2D[];
  viewport: { minX: number; maxX: number; minY: number; maxY: number };
  pc1: number[];
  pc2: number[];
}

export function computePCA(vectors: number[][]): PCAResult {
  const n = vectors.length;
  const dim = vectors[0]?.length ?? 0;
  if (n === 0 || dim === 0) {
    return {
      points: [],
      viewport: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      pc1: [],
      pc2: [],
    };
  }

  const mean = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) mean[i] += v[i];
  }
  for (let i = 0; i < dim; i++) mean[i] /= n;

  const centered = vectors.map((v) => subtract(v, mean));
  const pc1 = topEigenvector(centered, dim);
  const projected = projectOut(centered, pc1);
  const pc2 = topEigenvector(projected, dim);

  const points: Point2D[] = centered.map((v) => ({
    x: dot(v, pc1),
    y: dot(v, pc2),
  }));

  let minX = points[0].x,
    maxX = points[0].x,
    minY = points[0].y,
    maxY = points[0].y;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 0.05;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const viewport = {
    minX: minX - rangeX * pad,
    maxX: maxX + rangeX * pad,
    minY: minY - rangeY * pad,
    maxY: maxY + rangeY * pad,
  };

  return { points, viewport, pc1, pc2 };
}
