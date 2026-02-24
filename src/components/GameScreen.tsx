"use client";

import { useState, useRef, useEffect } from "react";

interface GameScreenProps {
  hints: string[];
  letterHelp: { firstLetter: string; wordLength: number } | null;
  maxGuesses: number | null;
  guessCount: number;
  gameEnded: boolean;
  onSubmit: (guess: string) => Promise<unknown>;
  disabled: boolean;
  revealedTarget: string | null;
  isLoss: boolean;
}

export function GameScreen({
  hints,
  letterHelp,
  maxGuesses,
  guessCount,
  gameEnded,
  onSubmit,
  disabled,
  revealedTarget,
  isLoss,
}: GameScreenProps) {
  const remaining = maxGuesses != null ? maxGuesses - guessCount : null;
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newHintIndex, setNewHintIndex] = useState<number | null>(null);
  const [scratchRest, setScratchRest] = useState("");
  const [revealedByClick, setRevealedByClick] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scratchInputRef = useRef<HTMLInputElement>(null);
  const prevVisibleRef = useRef(1);

  const autoReveal = guessCount >= 6 ? 3 : guessCount >= 3 ? 2 : 1;
  const visibleHintsCount = Math.min(hints.length, Math.max(1, revealedByClick, autoReveal));

  useEffect(() => {
    if (visibleHintsCount > prevVisibleRef.current) {
      setNewHintIndex(visibleHintsCount - 1);
      if (typeof window !== "undefined") {
        const el = document.getElementById("hints-block");
        if (el) {
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const threshold = vh * 0.25;
          const notVisible = rect.top > vh - threshold || rect.bottom < threshold;
          if (notVisible) {
            requestAnimationFrame(() => {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }
        }
      }
      const t = setTimeout(() => setNewHintIndex(null), 1200);
      prevVisibleRef.current = visibleHintsCount;
      return () => clearTimeout(t);
    }
    prevVisibleRef.current = visibleHintsCount;
  }, [visibleHintsCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (disabled) return;
    if (!trimmed) {
      setErr("Enter a word to guess.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setInput("");
      inputRef.current?.focus();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ marginBottom: "var(--space-6)" }}>
      {maxGuesses != null && !gameEnded && (
        <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-base)", color: "var(--text-muted)", fontWeight: 500 }}>
          {guessCount} of {maxGuesses} guesses used
          {remaining != null && remaining >= 0 && ` · ${remaining} left`}
        </p>
      )}
      <div
        className="sticky-guess-form card"
        style={{
          position: "sticky",
          bottom: 0,
          padding: "var(--space-4)",
          paddingBottom: "calc(var(--space-4) + env(safe-area-inset-bottom, 0px))",
          marginBottom: "var(--space-4)",
          zIndex: 1,
        }}
      >
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setErr(null); }}
            placeholder="Type a word…"
            disabled={disabled || submitting}
            autoComplete="off"
            style={{ width: "100%", fontSize: "var(--text-base)", padding: "var(--space-3) var(--space-4)" }}
            aria-describedby={err ? "guess-error" : undefined}
            aria-invalid={!!err}
          />
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", alignItems: "center" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={disabled || submitting || !input.trim()}
              style={{ flex: 1, padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-base)", fontWeight: 600 }}
              aria-busy={submitting}
            >
              {submitting ? "Checking…" : "Guess"}
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("hints-block")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="btn-secondary"
              style={{ padding: "var(--space-3) var(--space-3)", fontSize: "var(--text-sm)", flexShrink: 0 }}
            >
              Hints
            </button>
          </div>
        </form>
      </div>
      {err && (
        <p id="guess-error" role="alert" style={{ marginTop: "var(--space-2)", color: "var(--error)", fontSize: "var(--text-sm)" }}>
          {err}
        </p>
      )}
      <div
        id="hints-block"
        className="card"
        style={{
          padding: "var(--space-4) var(--space-5)",
          marginBottom: "var(--space-4)",
          borderLeft: "4px solid var(--accent)",
        }}
      >
        <div className={newHintIndex === 0 ? "hint-block hint-block--new" : "hint-block"}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)", marginBottom: "var(--space-1)" }}>
            Hint 1 of 3
            {newHintIndex === 0 && <span className="hint-new-badge">New</span>}
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-base)", lineHeight: 1.5, color: "var(--text)" }}>
            {hints[0]}
          </p>
        </div>
        {hints.length >= 2 && (
          <div className={newHintIndex === 1 ? "hint-block hint-block--new" : "hint-block"} style={{ marginTop: "var(--space-3)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)", marginBottom: "var(--space-1)" }}>
              Hint 2 of 3
              {newHintIndex === 1 && <span className="hint-new-badge">New</span>}
            </p>
            {visibleHintsCount >= 2 ? (
              <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {hints[1]}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealedByClick(2)}
                className="btn-secondary"
                style={{ marginTop: "var(--space-1)", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)" }}
              >
                Reveal hint 2
              </button>
            )}
          </div>
        )}
        {hints.length >= 3 && (
          <div className={newHintIndex === 2 ? "hint-block hint-block--new" : "hint-block"} style={{ marginTop: "var(--space-3)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)", marginBottom: "var(--space-1)" }}>
              Hint 3 of 3
              {newHintIndex === 2 && <span className="hint-new-badge">New</span>}
            </p>
            {visibleHintsCount >= 3 ? (
              <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {hints[2]}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealedByClick(3)}
                className="btn-secondary"
                style={{ marginTop: "var(--space-1)", padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)" }}
              >
                Reveal hint 3
              </button>
            )}
          </div>
        )}
        {letterHelp && (
          <>
            <p style={{ margin: "var(--space-3) 0 var(--space-1)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
              Letter help
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-subtle)" }}>
              Starts with <strong>{letterHelp.firstLetter}</strong> · {letterHelp.wordLength} letters
            </p>
          </>
        )}
      </div>

      {letterHelp && !gameEnded && (
        <div
          className="card"
          style={{
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
            background: "var(--border-light)",
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>
            Scratch paper
          </p>
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Try words here — doesn’t use a guess. {letterHelp.wordLength} letters total.
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={() => scratchInputRef.current?.focus()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scratchInputRef.current?.focus();
              }
            }}
            style={{ position: "relative", cursor: "text", outline: "none" }}
          >
            <div
              style={{
                display: "flex",
                gap: "var(--space-1)",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              {Array.from({ length: letterHelp.wordLength }, (_, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    minWidth: 24,
                    height: 32,
                    borderBottom: "2px solid var(--text-muted)",
                    fontSize: "var(--text-base)",
                    fontFamily: "var(--font-mono, monospace)",
                    color: "var(--text)",
                  }}
                  aria-hidden
                >
                  {i === 0
                    ? letterHelp.firstLetter
                    : scratchRest[i - 1] ?? ""}
                </span>
              ))}
            </div>
            <input
              ref={scratchInputRef}
              type="text"
              value={scratchRest}
              onChange={(e) => setScratchRest(e.target.value.toLowerCase().slice(0, letterHelp.wordLength - 1))}
              maxLength={letterHelp.wordLength - 1}
              autoComplete="off"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
                left: 0,
                top: 0,
              }}
              aria-label="Scratch paper: type a word"
              tabIndex={-1}
            />
          </div>
          <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {letterHelp.wordLength - 1 - scratchRest.length} letters left
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              onClick={() => setScratchRest("")}
              className="btn-secondary"
              style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)" }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {revealedTarget && (
        <p
          style={{
            marginBottom: "var(--space-4)",
            fontSize: "var(--text-base)",
            color: isLoss ? "var(--error)" : "var(--text)",
          }}
        >
          The word was: <strong>{revealedTarget}</strong>
        </p>
      )}

      {guessCount === 0 && !gameEnded && (
        <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Type a word and see how close it is.
        </p>
      )}
    </section>
  );
}
