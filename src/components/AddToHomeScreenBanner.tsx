"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "nearword_a2hs_dismissed";

export function AddToHomeScreenBanner() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (!isStandalone && !dismissed) setShow(true);
  }, [mounted]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div
      className="card"
      style={{
        marginBottom: "var(--space-4)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        flexWrap: "wrap",
      }}
      role="region"
      aria-label="Add to Home Screen"
    >
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", flex: "1 1 200px" }}>
        Add to Home Screen to play anytime and get the app experience.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <button type="button" onClick={dismiss} className="btn-secondary" style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-xs)" }}>
          Not now
        </button>
      </div>
    </div>
  );
}
