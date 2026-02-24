"use client";

import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

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

  if (isOnline) return null;

  return (
    <div
      role="alert"
      style={{
        background: "var(--error)",
        color: "#fff",
        padding: "var(--space-2) var(--space-4)",
        textAlign: "center",
        fontSize: "var(--text-sm)",
        marginBottom: "var(--space-4)",
      }}
    >
      You’re offline. Guesses and new puzzles need a connection.
    </div>
  );
}
