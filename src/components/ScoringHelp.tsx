"use client";

/**
 * Short blurb explaining what the % and cos numbers mean. Shown once the user has at least one guess.
 */
export function ScoringHelp() {
  return (
    <details
      className="card"
      style={{
        marginBottom: "var(--space-4)",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
        padding: "var(--space-2) var(--space-3)",
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 500, color: "var(--text)" }}>
        How scoring works
      </summary>
      <div style={{ marginTop: "var(--space-2)", lineHeight: 1.5 }}>
        <p style={{ margin: "0 0 var(--space-2)" }}>
          <strong>Higher % = closer in meaning</strong> to the secret word. We compare your guess to a big list of words; your % is how many of them you beat. 100% = you got the exact word.
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
          Expand <strong>Details</strong> under a guess for the technical score (0–1).
        </p>
      </div>
    </details>
  );
}
