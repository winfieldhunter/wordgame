"use client";

interface GuessRow {
  normalizedGuess: string;
  cosine: number;
  percentile: number | null;
  band: { label: string; emoji: string };
  guessIndex: number;
  warmerOrColder?: "warmer" | "colder" | "same";
}

/** Faint background and left border by temperature (hot = red, cold = blue). */
function getBandStyle(bandLabel: string): { borderLeft: string; background: string } {
  const hot = ["Bullseye", "Scorching", "On fire", "So close", "Very hot", "Hot"];
  const warm = ["Getting warm", "Warmer", "Lukewarm"];
  const cool = ["Tepid", "Cool", "Chilly"];
  if (hot.includes(bandLabel))
    return { borderLeft: "4px solid rgba(220, 38, 38, 0.5)", background: "rgba(220, 38, 38, 0.06)" };
  if (warm.includes(bandLabel))
    return { borderLeft: "4px solid rgba(234, 179, 8, 0.5)", background: "rgba(234, 179, 8, 0.06)" };
  if (cool.includes(bandLabel))
    return { borderLeft: "4px solid rgba(59, 130, 246, 0.4)", background: "rgba(59, 130, 246, 0.05)" };
  return { borderLeft: "4px solid rgba(30, 64, 175, 0.4)", background: "rgba(30, 64, 175, 0.05)" };
}

interface ScoringUIProps {
  guesses: GuessRow[];
  maxGuesses: number | null;
  isWin: boolean | null;
  isLoss: boolean;
  /** When true, ranking is unavailable (cosine-only); show banner and no "—" for percentile. */
  scoringMode?: "cosine_only" | "full";
}

export function ScoringUI({ guesses, maxGuesses, isWin, isLoss, scoringMode }: ScoringUIProps) {
  const cosineOnly = scoringMode === "cosine_only";
  const bestGuessIndex =
    guesses.length > 0
      ? guesses.reduce((best, g) => ((g.percentile ?? 0) > (best.percentile ?? 0) ? g : best), guesses[0]).guessIndex
      : null;
  const lastGuessIndex = guesses.length > 0 ? guesses[guesses.length - 1]!.guessIndex : null;
  const progressPct = maxGuesses != null && maxGuesses > 0 ? (guesses.length / maxGuesses) * 100 : 0;

  const guessesContent = (
    <>
      {cosineOnly && (
        <p
          style={{
            marginBottom: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            background: "var(--border-light)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Ranking temporarily unavailable (showing similarity only).
        </p>
      )}
      {maxGuesses != null && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--border-light)",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuenow={guesses.length}
            aria-valuemin={0}
            aria-valuemax={maxGuesses}
            aria-label={`${guesses.length} of ${maxGuesses} guesses used`}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "var(--accent)",
                borderRadius: 3,
                transition: "width 0.2s ease",
              }}
            />
          </div>
          <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {guesses.length} of {maxGuesses} used
            {!isWin && !isLoss && ` · ${maxGuesses - guesses.length} left`}
          </p>
        </div>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {guesses.map((g) => {
          const isLatest = g.guessIndex === lastGuessIndex;
          const isBest = bestGuessIndex != null && g.guessIndex === bestGuessIndex;
          const bandStyle = getBandStyle(g.band.label);
          return (
            <li
              key={g.guessIndex}
              className={isLatest ? "guess-row-latest" : undefined}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "var(--space-2) var(--space-3)",
                padding: "var(--space-3) var(--space-3)",
                marginLeft: "-var(--space-3)",
                marginRight: "-var(--space-3)",
                marginBottom: 2,
                borderBottom: "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                borderLeft: bandStyle.borderLeft,
                background: isBest ? "var(--border-light)" : isLatest ? "rgba(37, 99, 235, 0.06)" : bandStyle.background,
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  background: "var(--border-light)",
                  color: "var(--text)",
                }}
              >
                {g.band.label}
              </span>
              {g.warmerOrColder === "colder" && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Further away</span>
              )}
              {g.warmerOrColder === "warmer" && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: 500 }}>Closer!</span>
              )}
              <span style={{ flex: "1 1 auto", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)" }}>
                {g.normalizedGuess}
              </span>
              {isBest && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--accent)", fontWeight: 600 }}>Best</span>
              )}
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
                {g.percentile != null ? `${g.percentile.toFixed(1)}%` : ""}
              </span>
              <details style={{ flexBasis: "100%", marginTop: "var(--space-1)", marginBottom: 0 }}>
                <summary style={{ cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
                  Details
                </summary>
                <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Cosine similarity: {g.cosine.toFixed(3)} (0 = unrelated, 1 = exact match)
                </p>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <section style={{ marginBottom: isWin ? "var(--space-4)" : "var(--space-6)" }}>
      {isWin ? (
        <details style={{ marginBottom: "var(--space-2)" }} open={true}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "var(--text-base)", listStyle: "none", marginBottom: "var(--space-2)" }}>
            Your guesses
          </summary>
          {guessesContent}
        </details>
      ) : (
        <>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Your guesses</h2>
          {guessesContent}
        </>
      )}
      {isWin && (
        <div
          className="win-message"
          style={{
            marginTop: "var(--space-5)",
            padding: "var(--space-5) var(--space-5)",
            background: "var(--success)",
            border: "none",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)",
          }}
        >
          <p style={{ margin: 0, fontSize: "clamp(1.35rem, 3.5vw, 1.75rem)", color: "#fff", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.2 }}>
            You got it!
          </p>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "rgba(255,255,255,0.92)" }}>
            Solved in {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}.
          </p>
        </div>
      )}
      {isLoss && !isWin && (
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-base)", color: "var(--error)" }}>
          Out of guesses. Better luck next time.
        </p>
      )}
    </section>
  );
}
