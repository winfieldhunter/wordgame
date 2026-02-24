"use client";

import { useEffect, useRef, useState } from "react";
import { getFriendlyErrorMessage } from "@/lib/apiErrorMessages";

interface Point {
  id: string;
  x: number;
  y: number;
  kind: "target" | "your_guess" | "crowd_guess";
  label?: string;
  band?: string;
  emoji?: string;
  count?: number;
  percentile?: number | null;
  cosine?: number;
  /** True when this guess is the puzzle target; do not render as guess dot, only target marker. */
  isTarget?: boolean;
}

interface SemanticMapProps {
  sessionId: string;
  puzzleId: string;
  /** When true, show "Answer" label near target marker (e.g. for screenshots after win). */
  isWin?: boolean;
}

export function SemanticMap({ sessionId, puzzleId, isWin }: SemanticMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{
    points: Point[];
    viewport: { minX: number; maxX: number; minY: number; maxY: number };
  } | null>(null);
  const [showCrowd, setShowCrowd] = useState(true);
  const [showGuesses, setShowGuesses] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [crowdBackfillError, setCrowdBackfillError] = useState<string | null>(null);
  const frameRef = useRef<number>(0);
  const showCrowdRef = useRef(showCrowd);
  const showGuessesRef = useRef(showGuesses);
  showCrowdRef.current = showCrowd;
  showGuessesRef.current = showGuesses;

  useEffect(() => {
    fetch(`/api/map/${puzzleId}?sessionId=${sessionId}`)
      .then(async (r) => {
        if (r.status === 403) throw new Error("Complete the puzzle first.");
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(getFriendlyErrorMessage(data.code, data.error ?? "Could not load map."));
        }
        return r.json();
      })
      .then((res) => {
        setData(res.projection);
        setCrowdBackfillError(res.crowdBackfillError ?? null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, puzzleId]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 28;
    const { points, viewport } = data;
    const rangeX = viewport.maxX - viewport.minX || 1;
    const rangeY = viewport.maxY - viewport.minY || 1;

    const toX = (x: number) => ((x - viewport.minX) / rangeX) * (w - padding * 2) + padding;
    const toY = (y: number) => h - padding - ((y - viewport.minY) / rangeY) * (h - padding * 2);

    let start: number | null = null;
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (t: number) => {
      if (!canvasRef.current || !data) return;
      const elapsed = t - (start ?? t);
      if (start === null) start = t;
      const breath = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * 0.0018);
      const scale = prefersReducedMotion ? 1 : 0.88 + 0.24 * breath;

      ctx.clearRect(0, 0, w, h);

      const centerX = (padding + w - padding) / 2;
      const centerY = (padding + h - padding) / 2;
      const bg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(w, h) * 0.8);
      bg.addColorStop(0, "#fefce8");
      bg.addColorStop(0.5, "#fafaf9");
      bg.addColorStop(1, "#f5f5f4");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(0,0,0,0.035)";
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let gx = padding; gx <= w - padding; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, padding);
        ctx.lineTo(gx, h - padding);
        ctx.stroke();
      }
      for (let gy = padding; gy <= h - padding; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(padding, gy);
        ctx.lineTo(w - padding, gy);
        ctx.stroke();
      }

      const yourPoints = points.filter(
        (p) => p.kind === "your_guess" && showGuessesRef.current && !p.isTarget
      );
      const crowdPoints = showCrowdRef.current ? points.filter((p) => p.kind === "crowd_guess") : [];
      const targetPoint = points.find((p) => p.kind === "target");

      const maxCount = crowdPoints.length > 0 ? Math.max(1, ...crowdPoints.map((p) => p.count ?? 1)) : 1;
      if (showCrowdRef.current && crowdPoints.length > 0) {
        for (const p of crowdPoints) {
          const r = 2.5 + 3 * ((p.count ?? 1) / maxCount);
          const alpha = 0.2 + 0.2 * ((p.count ?? 1) / maxCount);
          ctx.fillStyle = `rgba(120, 113, 108, ${alpha})`;
          ctx.beginPath();
          ctx.arc(toX(p.x), toY(p.y), r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const p of yourPoints) {
        const x = toX(p.x);
        const y = toY(p.y);
        const tRaw = p.percentile != null ? p.percentile / 100 : (p.cosine != null ? p.cosine : 0);
        const t = Math.min(1, Math.max(0, tRaw));
        const r = Math.round(59 + t * 196);
        const g = Math.round(130 - t * 130);
        const b = Math.round(246 - t * 246);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
        if (p.label) {
          ctx.font = "11px DM Sans, system-ui, sans-serif";
          const tw = ctx.measureText(p.label).width;
          const lw = tw + 10;
          const lh = 16;
          const lx = x + 8;
          const ly = y - lh / 2;
          ctx.shadowColor = "rgba(0,0,0,0.08)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillRect(lx, ly, lw, lh);
          ctx.strokeStyle = "rgba(0,0,0,0.06)";
          ctx.strokeRect(lx, ly, lw, lh);
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = "#1c1917";
          ctx.fillText(p.label, lx + 5, ly + 11);
        }
      }

      if (targetPoint) {
        const x = toX(targetPoint.x);
        const y = toY(targetPoint.y);
        const rOuter = 10 * scale;
        const rInner = 5 * scale;
        ctx.shadowColor = "rgba(220, 38, 38, 0.35)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, rOuter, 0, Math.PI * 2);
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, rInner, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 38, 38, ${0.25 + 0.1 * breath})`;
        ctx.fill();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1;
        ctx.stroke();
        if (isWin) {
          ctx.font = "10px DM Sans, system-ui, sans-serif";
          ctx.fillStyle = "#dc2626";
          ctx.textAlign = "center";
          ctx.fillText("Answer", x, y + rOuter + 14);
          ctx.textAlign = "left";
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw(performance.now());
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [data, showCrowd, showGuesses, isWin]);

  if (loading) return <p style={{ color: "var(--text-subtle)" }}>Loading map…</p>;
  if (err) return <p style={{ color: "var(--error)" }}>{err}</p>;
  if (!data) return null;

  return (
    <div>
      <div
        style={{
          marginBottom: "var(--space-2)",
          display: "flex",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            minHeight: 44,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={showGuesses}
            onChange={(e) => setShowGuesses(e.target.checked)}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          Show my guesses
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            minHeight: 44,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={showCrowd}
            onChange={(e) => setShowCrowd(e.target.checked)}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          Show crowd
        </label>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{
          width: "100%",
          maxWidth: 400,
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        }}
      />
      <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
        Color = closeness (blue → far, red → close).
      </p>
      {showCrowd && data.points.filter((p) => p.kind === "crowd_guess").length === 0 && (
        <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: crowdBackfillError ? "var(--error)" : "var(--text-subtle)", fontStyle: "italic" }}>
          {crowdBackfillError ?? "No crowd data for this puzzle yet."}
        </p>
      )}
    </div>
  );
}
