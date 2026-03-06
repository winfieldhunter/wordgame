"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GameScreen } from "@/components/GameScreen";
import { ScoringUI } from "@/components/ScoringUI";
import { ScoringHelp } from "@/components/ScoringHelp";
import { PostGameTabs } from "@/components/PostGameTabs";
import { AddToHomeScreenBanner } from "@/components/AddToHomeScreenBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { getFriendlyErrorMessage } from "@/lib/apiErrorMessages";
import { defaultGameConfig } from "@/config/gameConfig";

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
  const [level, setLevel] = useState<"easy" | "medium" | "hard">("easy");
  const [completedLevels, setCompletedLevels] = useState<("easy" | "medium" | "hard")[]>([]);
  const [todayPuzzleIds, setTodayPuzzleIds] = useState<{ easy: string; medium: string; hard: string } | null>(null);
  const [theme, setTheme] = useState<string>("");
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [hintsUsedForRun, setHintsUsedForRun] = useState<number | null>(null);
  const [progressiveHints, setProgressiveHints] = useState(defaultGameConfig.progressiveHints);
  const [todayScore, setTodayScore] = useState<number | null>(null);
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
        setPuzzleId(data.currentPuzzleId ?? data.puzzleId);
        setHints(data.hints ?? []);
        setLetterHelp(data.letterHelp ?? null);
        setMaxGuesses(data.config?.maxGuesses ?? 8);
        if (data.config?.progressiveHints) setProgressiveHints(data.config.progressiveHints);
        setRevealedTarget(data.revealedTarget ?? null);
        setPercentileUnavailable(!!data.percentileUnavailable);
        setDifficulty(data.difficulty === "hard" ? "hard" : "normal");
        setLevel(data.level ?? "easy");
        setCompletedLevels(Array.isArray(data.completedLevels) ? data.completedLevels : []);
        if (data.todayPuzzleIds && typeof data.todayPuzzleIds === "object") setTodayPuzzleIds(data.todayPuzzleIds);
        if (typeof data.theme === "string") setTheme(data.theme);
        if (typeof data.formattedDate === "string") setFormattedDate(data.formattedDate);
        if (data.runEnded) {
          setRunEnded(true);
          if (data.isWin !== undefined) setIsWin(data.isWin);
          if (data.isLoss !== undefined) setIsLoss(data.isLoss);
          if (Array.isArray(data.guesses) && data.guesses.length > 0) setGuesses(data.guesses);
        } else {
          setRunEnded(false);
          setGuesses([]);
          setIsWin(null);
          setIsLoss(false);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !todayPuzzleIds || !runEnded || completedLevels.length !== 3) return;
    const todayKey = todayPuzzleIds.easy.match(/^daily-(\d{4}-\d{2}-\d{2})-/)?.[1] ?? null;
    if (!todayKey) return;
    fetch(`/api/history?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const day = (d?.days ?? []).find((day: { date: string }) => day.date === todayKey);
        if (day != null) setTodayScore(day.dailyScore);
      })
      .catch(() => {});
  }, [sessionId, todayPuzzleIds, runEnded, completedLevels.length]);

  const fetchToday = () => {
    if (!sessionId) return;
    fetch(`/api/today?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setPuzzleId(data.currentPuzzleId ?? data.puzzleId);
        setHints(data.hints ?? []);
        setLetterHelp(data.letterHelp ?? null);
        setMaxGuesses(data.config?.maxGuesses ?? 8);
        if (data.config?.progressiveHints) setProgressiveHints(data.config.progressiveHints);
        setRevealedTarget(data.revealedTarget ?? null);
        setPercentileUnavailable(!!data.percentileUnavailable);
        setDifficulty(data.difficulty === "hard" ? "hard" : "normal");
        setLevel(data.level ?? "easy");
        setCompletedLevels(Array.isArray(data.completedLevels) ? data.completedLevels : []);
        if (data.todayPuzzleIds && typeof data.todayPuzzleIds === "object") setTodayPuzzleIds(data.todayPuzzleIds);
        if (typeof data.theme === "string") setTheme(data.theme);
        if (typeof data.formattedDate === "string") setFormattedDate(data.formattedDate);
        if (data.runEnded) {
          setRunEnded(true);
          if (data.isWin !== undefined) setIsWin(data.isWin);
          if (data.isLoss !== undefined) setIsLoss(data.isLoss);
          if (Array.isArray(data.guesses) && data.guesses.length > 0) setGuesses(data.guesses);
        } else {
          setRunEnded(false);
          setGuesses([]);
          setIsWin(null);
          setIsLoss(false);
        }
      })
      .catch(() => {});
  };

  const fetchPuzzleAgain = () => {
    fetchToday();
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
    else fetchPuzzleAgain();
    if (result.revealedTarget) setRevealedTarget(result.revealedTarget);
    if (result.percentileUnavailable) setPercentileUnavailable(true);
    // Don't auto-advance when run ends — user stays on this level to see the revealed word; they click "Continue" to go to next.
  };

  const gameEnded = runEnded;
  const showScoring = guesses.length > 0;

  const advanceToNextLevel = () => {
    if (!todayPuzzleIds || !sessionId) return;
    const next: { level: "medium" | "hard"; id: string } | null =
      level === "easy" ? { level: "medium", id: todayPuzzleIds.medium } :
      level === "medium" ? { level: "hard", id: todayPuzzleIds.hard } : null;
    if (!next) return;
    setPuzzleId(next.id);
    setLevel(next.level);
    setRunEnded(false);
    setGuesses([]);
    setRevealedTarget(null);
    setIsWin(null);
    setIsLoss(false);
    setHints([]);
    setLetterHelp(null);
    setHintsUsedForRun(null);
    fetch(`/api/puzzle/${next.id}?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setHints(data.hints ?? []);
        setLetterHelp(data.letterHelp ?? null);
        setMaxGuesses(data.config?.maxGuesses ?? 8);
        if (typeof data.theme === "string") setTheme(data.theme);
        if (typeof data.formattedDate === "string") setFormattedDate(data.formattedDate);
      })
      .catch(() => {});
  };

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
                  setPuzzleId(data.currentPuzzleId ?? data.puzzleId);
                  setHints(data.hints ?? []);
                  setLetterHelp(data.letterHelp ?? null);
                  setMaxGuesses(data.config?.maxGuesses ?? 8);
                  if (data.config?.progressiveHints) setProgressiveHints(data.config.progressiveHints);
                  setRevealedTarget(data.revealedTarget ?? null);
                  setPercentileUnavailable(!!data.percentileUnavailable);
                  setLevel(data.level ?? "easy");
                  setCompletedLevels(Array.isArray(data.completedLevels) ? data.completedLevels : []);
                  if (data.todayPuzzleIds && typeof data.todayPuzzleIds === "object") setTodayPuzzleIds(data.todayPuzzleIds);
                  if (typeof data.theme === "string") setTheme(data.theme);
                  if (typeof data.formattedDate === "string") setFormattedDate(data.formattedDate);
                  if (data.runEnded) {
                    setRunEnded(true);
                    if (data.isWin !== undefined) setIsWin(data.isWin);
                    if (data.isLoss !== undefined) setIsLoss(data.isLoss);
                    if (Array.isArray(data.guesses) && data.guesses.length > 0) setGuesses(data.guesses);
                  } else {
                    setRunEnded(false);
                    setGuesses([]);
                    setIsWin(null);
                    setIsLoss(false);
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <div>
          <h1 className="app-logo" style={{ margin: 0 }}>
            <span style={{ color: "var(--accent)" }}>Near</span>
            <span style={{ color: "var(--text)" }}>Word</span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginLeft: "var(--space-2)",
              }}
            >
              {" "}{level}
            </span>
          </h1>
          {(formattedDate || theme) && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
              {formattedDate}{theme ? ` · ${theme}` : ""}
            </p>
          )}
        </div>
        <Link href="/history" className="btn-secondary" style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)", textDecoration: "none" }}>
          History
        </Link>
      </div>
      {level === "easy" && (
        <p style={{ color: "var(--text-subtle)", fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
          Easy = warm-up, Medium = main challenge, Hard = toughest.
        </p>
      )}
      <p style={{ color: "var(--text-muted)", fontSize: "var(--text-base)", marginBottom: "var(--space-1)" }}>
        Get as close as you can to the secret word.
      </p>
      <p style={{ color: "var(--text-subtle)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
        {maxGuesses != null
          ? `You get ${maxGuesses} guesses. `
          : ""}
        3 hints total — Hint 2 unlocks after {progressiveHints.revealSecondHintAfterGuesses} guesses, Hint 3 after {progressiveHints.revealThirdHintAfterGuesses}.
      </p>

      <GameScreen
        key={puzzleId}
        hints={hints}
        letterHelp={letterHelp}
        maxGuesses={maxGuesses}
        progressiveHints={progressiveHints}
        guessCount={guesses.length}
        gameEnded={gameEnded}
        onHintsUsed={setHintsUsedForRun}
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

      {gameEnded && todayPuzzleIds && level !== "hard" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          {level === "easy" && (
            <p style={{ color: "var(--text-subtle)", fontSize: "var(--text-sm)", marginBottom: "var(--space-2)" }}>
              Your daily score is easy + medium + hard. Continue to Medium to add to today&apos;s score.
            </p>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={advanceToNextLevel}
            style={{ padding: "var(--space-3) var(--space-5)", fontSize: "var(--text-base)", fontWeight: 600 }}
          >
            Continue to {level === "easy" ? "Medium" : "Hard"}
          </button>
        </div>
      )}

      {gameEnded && todayScore != null && (
        <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--accent)" }}>
          Today&apos;s score: {todayScore}
        </p>
      )}
      {gameEnded && (
        <PostGameTabs
          sessionId={sessionId}
          puzzleId={puzzleId}
          guesses={guesses}
          isWin={isWin === true}
          maxGuesses={maxGuesses}
          hintsUsed={hintsUsedForRun}
          bestGuess={guesses.length > 0 ? (guesses.reduce((a, b) => ((b.percentile ?? 0) > (a.percentile ?? 0) ? b : a), guesses[0]) ?? null) : null}
          revealedTarget={revealedTarget}
          onComplete={() => fetchPuzzleAgain()}
        />
      )}
    </main>
  );
}
