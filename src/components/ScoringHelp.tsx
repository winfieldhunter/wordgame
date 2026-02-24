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
          <strong>% (percentile) is your main score.</strong> Your guess is compared to 50,000 words. The percentage means “closer to the secret word than this many of them.” So 94% = your guess is closer than about 94% of the list. Only the exact word scores 100%.
        </p>
        <p style={{ margin: 0 }}>
          For more detail on a guess, expand <strong>Details</strong> under that guess to see its cosine similarity (0–1).
        </p>
      </div>
    </details>
  );
}
