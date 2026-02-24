"use client";

import { useEffect, useState } from "react";
import { GameScreen } from "@/components/GameScreen";
import { ScoringUI } from "@/components/ScoringUI";
import { ScoringHelp } from "@/components/ScoringHelp";
import { PostGameTabs } from "@/components/PostGameTabs";
import { AddToHomeScreenBanner } from "@/components/AddToHomeScreenBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { getFriendlyErrorMessage } from "@/lib/apiErrorMessages";

const SESSION_KEY = "nearword_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [letterHelp, setLetterHelp] = useState<{ firstLetter: string; wordLength: number } | null>(null);
  const [guesses, setGuesses] = useState<Array<{ normalizedGuess: string; cosine: number; percentile: number | null; band: { label: string; emoji: string }; guessIndex: number; warmerOrColder?: "warmer" | "colder" | "same" }>>([]);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [isLoss, setIsLoss] = useState(false);
  const [revealedTarget, setRevealedTarget] = useState<string | null>(null);
  const [maxGuesses, setMaxGuesses] = useState<number | null>(8);
  const [percentileUnavailable, setPercentileUnavailable] = useState(false);
  const [runEnded, setRunEnded] = useState(false);
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/today?sessionId=${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load today's puzzle.");
        return r.json();
      })
      .then((data) => {
        setPuzzleId(data.puzzleId);
        setHints(data.hints ?? []);
        setLetterHelp(data.letterHelp ?? null);
        setMaxGuesses(data.config?.maxGuesses ?? 8);
        setRevealedTarget(data.revealedTarget ?? null);
        setPercentileUnavailable(!!data.percentileUnavailable);
        setDifficulty(data.difficulty === "hard" ? "hard" : "normal");
        if (data.runEnded) {
          setRunEnded(true);
          if (data.isWin !== undefined) setIsWin(data.isWin);
          if (data.isLoss !== undefined) setIsLoss(data.isLoss);
          if (Array.isArray(data.guesses) && data.guesses.length > 0) setGuesses(data.guesses);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const fetchPuzzleAgain = () => {
    if (!sessionId || !puzzleId) return;
    fetch(`/api/puzzle/${puzzleId}?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setHints(data.hints ?? []);
        setLetterHelp(data.letterHelp ?? null);
        setRevealedTarget(data.revealedTarget ?? null);
        if (data.difficulty === "hard") setDifficulty("hard");
      });
  };

  const handleGuess = (result: {
    normalizedGuess: string;
    cosine: number;
    percentile: number | null;
    band: { label: string; emoji: string };
    guessIndex: number;
    warmerOrColder?: "warmer" | "colder" | "same";
    isWin: boolean;
    isLoss: boolean;
    runEnded?: boolean;
    revealedTarget?: string;
    percentileUnavailable?: boolean;
  }) => {
    setGuesses((prev) => [
      ...prev,
      {
        normalizedGuess: result.normalizedGuess,
        cosine: result.cosine,
        percentile: result.percentile,
        band: result.band,
        guessIndex: result.guessIndex,
        warmerOrColder: result.warmerOrColder,
      },
    ]);
    setIsWin(result.isWin);
    setIsLoss(result.isLoss);
    if (result.runEnded !== undefined) setRunEnded(result.runEnded);
    if (result.revealedTarget) setRevealedTarget(result.revealedTarget);
    if (result.percentileUnavailable) setPercentileUnavailable(true);
    fetchPuzzleAgain();
  };

  const gameEnded = runEnded;
  const showScoring = guesses.length > 0;

  if (loading) {
    return (
      <main className="main-container">
        <div style={{ height: 28, width: 140, background: "var(--border-light)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)" }} aria-hidden />
        <div style={{ height: 20, width: "90%", maxWidth: 320, background: "var(--border-light)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} aria-hidden />
        <div style={{ height: 20, width: "70%", maxWidth: 260, background: "var(--border-light)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-6)" }} aria-hidden />
        <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)" }}>
          <div style={{ height: 14, width: 80, background: "var(--border-light)", borderRadius: 4, marginBottom: "var(--space-2)" }} aria-hidden />
          <div style={{ height: 16, width: "100%", background: "var(--border-light)", borderRadius: 4 }} aria-hidden />
        </div>
        <div style={{ height: 44, width: "100%", background: "var(--border-light)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} aria-hidden />
        <div style={{ height: 44, width: 100, background: "var(--border)", borderRadius: "var(--radius-sm)" }} aria-hidden />
        <p style={{ marginTop: "var(--space-4)", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Loading today’s puzzle…</p>
      </main>
    );
  }

  if (error || !puzzleId) {
    return (
      <main className="main-container" style={{ paddingTop: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--error)", marginBottom: "var(--space-4)", fontSize: "var(--text-base)" }}>
          {error ?? "No puzzle for today. Check back later."}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setError(null);
            setLoading(true);
            if (sessionId) {
              fetch(`/api/today?sessionId=${sessionId}`)
                .then((r) => { if (!r.ok) throw new Error("Could not load today's puzzle."); return r.json(); })
                .then((data) => {
                  setPuzzleId(data.puzzleId);
                  setHints(data.hints ?? []);
                  setLetterHelp(data.letterHelp ?? null);
                  setMaxGuesses(data.config?.maxGuesses ?? 8);
                  setRevealedTarget(data.revealedTarget ?? null);
                  setPercentileUnavailable(!!data.percentileUnavailable);
                  if (data.runEnded) {
                    setRunEnded(true);
                    if (data.isWin !== undefined) setIsWin(data.isWin);
                    if (data.isLoss !== undefined) setIsLoss(data.isLoss);
                    if (Array.isArray(data.guesses) && data.guesses.length > 0) setGuesses(data.guesses);
                  }
                })
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            } else setLoading(false);
          }}
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="main-container">
      <OfflineBanner />
      <AddToHomeScreenBanner />
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <h1 className="app-logo" style={{ margin: 0 }}>
          <span style={{ color: "var(--accent)" }}>Near</span>
          <span style={{ color: "var(--text)" }}>Word</span>
        </h1>
        {difficulty === "hard" && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Hard
          </span>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)", marginBottom: "var(--space-1)" }}>
        Get as close as you can to the secret word.
      </p>
      <p style={{ color: "var(--text-subtle)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
        {maxGuesses != null
          ? `You get ${maxGuesses} guesses. `
          : ""}
        3 hints total.
      </p>

      <GameScreen
        hints={hints}
        letterHelp={letterHelp}
        maxGuesses={maxGuesses}
        guessCount={guesses.length}
        gameEnded={gameEnded}
        onSubmit={async (guess) => {
          const res = await fetch("/api/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              puzzleId,
              guess,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            const message = getFriendlyErrorMessage(data.code, data.error ?? "Something went wrong.");
            throw new Error(message);
          }
          handleGuess(data);
          return data;
        }}
        disabled={gameEnded || !isOnline}
        revealedTarget={revealedTarget}
        isLoss={isLoss}
      />

      {showScoring && (
        <>
          <ScoringHelp />
          <ScoringUI
            guesses={guesses}
            maxGuesses={maxGuesses}
            isWin={isWin}
            isLoss={isLoss}
            scoringMode={percentileUnavailable ? "cosine_only" : "full"}
          />
        </>
      )}

      {gameEnded && (
        <PostGameTabs
          sessionId={sessionId}
          puzzleId={puzzleId}
          guesses={guesses}
          isWin={isWin === true}
          maxGuesses={maxGuesses}
          onComplete={() => fetchPuzzleAgain()}
        />
      )}
    </main>
  );
}
