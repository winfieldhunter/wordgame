"use client";

import { useState, useEffect } from "react";

interface ShareButtonProps {
  shareText: string;
}

export function ShareButton({ shareText }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("copied");
    } catch {
      // ignore
    }
  };

  const share = async () => {
    if (!navigator.share) {
      copy();
      return;
    }
    try {
      await navigator.share({
        title: "NearWord",
        text: shareText,
        url: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setStatus("shared");
    } catch (e) {
      if ((e as Error).name !== "AbortError") copy();
    }
  };

  const handleClick = canShare ? share : copy;
  const label =
    status === "copied" ? "Copied!" : status === "shared" ? "Shared!" : canShare ? "Share results" : "Copy results";

  return (
    <div style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={handleClick}
        className={status === "idle" ? "btn-primary" : "btn-secondary"}
        style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 600 }}
        aria-live="polite"
        aria-label={label}
      >
        {(status === "copied" || status === "shared") && (
          <span aria-hidden style={{ marginRight: "var(--space-2)" }}>✓</span>
        )}
        {label}
      </button>
      {status === "copied" && (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--success)" }}>Copied to clipboard</span>
      )}
    </div>
  );
}
