"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SESSION_KEY = "nearword_session_id";

type PuzzleLevel = "easy" | "medium" | "hard";

interface LevelRow {
  level: PuzzleLevel;
  isWin: boolean;
  guessCount: number;
  hintsUsed: number | null;
  bestPercentile: number | null;
  bestGuess: string | null;
  target: string | null;
  hints: string[];
}

interface DayRow {
  date: string;
  dailyScore: number;
  levels: LevelRow[];
}

interface HistoryData {
  displayName: string | null;
  days: DayRow[];
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SESSION_KEY) ?? "";
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryPage() {
  const [sessionId, setSessionId] = useState("");
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setData({ displayName: null, days: [] });
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/history?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => {
        if (!r.ok) {
          if (r.status === 503) return { displayName: null, days: [] };
          throw new Error("Could not load history.");
        }
        return r.json();
      })
      .then((d) => setData({ displayName: d.displayName ?? null, days: d.days ?? [] }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const isEmpty = data && data.days.length === 0;

  return (
    <main className="main-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        <h1 className="app-logo" style={{ margin: 0, fontSize: "var(--text-xl)" }}>
          <span style={{ color: "var(--accent)" }}>Near</span>
          <span style={{ color: "var(--text)" }}>Word</span>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: "var(--space-2)" }}>
            History
          </span>
        </h1>
        <Link
          href="/"
          className="btn-secondary"
          style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)", textDecoration: "none" }}
        >
          ← Today
        </Link>
      </div>

      {data?.displayName && (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)", marginBottom: "var(--space-4)" }}>
          Playing as <strong>{data.displayName}</strong>
        </p>
      )}

      {loading && (
        <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-subtle)" }} aria-live="polite">
          Loading history…
        </div>
      )}

      {error && (
        <p style={{ color: "var(--error)", marginBottom: "var(--space-4)" }}>{error}</p>
      )}

      {!loading && !error && isEmpty && (
        <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Play easy, medium, and hard to build your daily score and see history.
          </p>
          <Link href="/" className="btn-primary" style={{ display: "inline-block", marginTop: "var(--space-4)", textDecoration: "none" }}>
            Play today
          </Link>
        </div>
      )}

      {!loading && !error && data && data.days.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {data.days.map((day) => (
            <li key={day.date} style={{ marginBottom: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => setExpandedDate((prev) => (prev === day.date ? null : day.date))}
                className="card"
                style={{
                  width: "100%",
                  padding: "var(--space-4)",
                  textAlign: "left",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                }}
                aria-expanded={expandedDate === day.date}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{formatDate(day.date)}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>Score: {day.dailyScore}</span>
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)", marginTop: "var(--space-1)" }}>
                  {expandedDate === day.date ? "Hide details" : "Show details"}
                </div>
              </button>
              {expandedDate === day.date && (
                <div className="card" style={{ marginTop: "var(--space-2)", padding: "var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  {day.levels.map((lev) => (
                    <div key={lev.level} style={{ marginBottom: lev.level !== "hard" ? "var(--space-4)" : 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize", marginBottom: "var(--space-2)" }}>{lev.level}</div>
                      {lev.target && <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-sm)" }}>Target: <strong>{lev.target}</strong></p>}
                      {lev.hints.length > 0 && <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Hints: {lev.hints.join(" • ")}</p>}
                      {lev.guessCount > 0 || lev.isWin ? (
                        <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
                          {lev.isWin ? "Won" : "Loss"} — {lev.guessCount} guesses
                          {lev.hintsUsed != null && `, ${lev.hintsUsed} hints`}
                          {!lev.isWin && lev.bestGuess && lev.bestPercentile != null && ` — closest: ${lev.bestGuess} (${Math.round(lev.bestPercentile)}%)`}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Not played</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
