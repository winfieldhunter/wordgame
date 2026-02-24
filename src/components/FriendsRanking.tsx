"use client";

import { useState, useEffect, useCallback } from "react";

const GROUP_CODE_KEY = "nearword_group_code";

interface GroupRankingEntry {
  sessionId: string;
  isYou: boolean;
  isWin: boolean;
  guessCount: number;
  bestPercentile: number | null;
  bestGuess: string | null;
  rank: number;
}

interface FriendsRankingProps {
  sessionId: string;
  puzzleId: string;
}

export function FriendsRanking({ sessionId, puzzleId }: FriendsRankingProps) {
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<GroupRankingEntry[] | null>(null);
  const [youRank, setYouRank] = useState<number | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  const loadStoredCode = useCallback(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(GROUP_CODE_KEY)?.trim()?.toUpperCase();
    setGroupCode(stored || null);
  }, []);

  useEffect(() => {
    loadStoredCode();
  }, [loadStoredCode]);

  useEffect(() => {
    if (!groupCode || !sessionId || !puzzleId) {
      setRankings(null);
      setYouRank(null);
      return;
    }
    setRankingLoading(true);
    fetch(`/api/group/ranking?puzzleId=${encodeURIComponent(puzzleId)}&sessionId=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(groupCode)}`)
      .then((r) => r.json())
      .then((data) => {
        setRankings(data.rankings ?? []);
        setYouRank(data.youRank ?? null);
      })
      .catch(() => {
        setRankings([]);
        setYouRank(null);
      })
      .finally(() => setRankingLoading(false));
  }, [groupCode, sessionId, puzzleId]);

  const handleCreate = () => {
    setCreateLoading(true);
    fetch("/api/group/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.code) {
          const code = String(data.code).toUpperCase();
          localStorage.setItem(GROUP_CODE_KEY, code);
          setGroupCode(code);
        }
      })
      .finally(() => setCreateLoading(false));
  };

  const handleJoin = () => {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setJoinLoading(true);
    setJoinError(null);
    fetch("/api/group/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setJoinError(data.error);
          return;
        }
        localStorage.setItem(GROUP_CODE_KEY, code);
        setGroupCode(code);
        setJoinInput("");
      })
      .catch(() => setJoinError("Could not join."))
      .finally(() => setJoinLoading(false));
  };

  const leaveGroup = () => {
    localStorage.removeItem(GROUP_CODE_KEY);
    setGroupCode(null);
    setRankings(null);
    setYouRank(null);
  };

  if (groupCode) {
    return (
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Group code: <strong style={{ color: "var(--text)", fontFamily: "monospace" }}>{groupCode}</strong>
          </p>
          <button type="button" className="btn-secondary" style={{ fontSize: "var(--text-xs)" }} onClick={leaveGroup}>
            Leave group
          </button>
        </div>
        {rankingLoading ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Loading ranking…</p>
        ) : rankings && rankings.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: "var(--space-4)", listStyle: "decimal" }}>
            {rankings.map((e) => (
              <li key={e.sessionId} style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                <span style={{ fontWeight: e.isYou ? 600 : 400, color: e.isYou ? "var(--text)" : "var(--text-muted)" }}>
                  {e.isYou ? "You" : `Player #${e.rank}`}
                </span>
                {e.isWin ? (
                  <span style={{ color: "var(--text-muted)" }}> — Got it in {e.guessCount} {e.guessCount === 1 ? "guess" : "guesses"}</span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    — Closest: {e.bestPercentile != null ? `${e.bestPercentile.toFixed(1)}%` : ""}
                    {e.bestGuess ? ` (“${e.bestGuess}”)` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            No one in your group has completed this puzzle yet. Share the code so friends can join and play.
          </p>
        )}
        {youRank != null && rankings && rankings.length > 1 && (
          <p style={{ marginTop: "var(--space-3)", marginBottom: 0, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
            Your rank: {youRank} of {rankings.length}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "var(--space-4)" }}>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", color: "var(--text)" }}>
        Compete with friends: create a group and share the code, or join with their code. See who got it in the fewest tries and who got closest without guessing it.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-start" }}>
        <div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreate}
            disabled={createLoading}
            style={{ marginBottom: "var(--space-2)" }}
          >
            {createLoading ? "Creating…" : "Create a group"}
          </button>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
            Share the code with friends so they can join.
          </p>
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              placeholder="Enter code"
              maxLength={8}
              style={{
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--text-base)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                width: "6ch",
                fontFamily: "monospace",
                textTransform: "uppercase",
              }}
            />
            <button type="button" className="btn-secondary" onClick={handleJoin} disabled={joinLoading || !joinInput.trim()}>
              {joinLoading ? "Joining…" : "Join"}
            </button>
          </div>
          {joinError && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--error)" }}>{joinError}</p>}
        </div>
      </div>
    </div>
  );
}
