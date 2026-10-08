"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Measures how long each page is visible and reports it to the server, where
// it is stored as a PageVisit and used for the "average time on page" statistic.
// The time is only counted while the tab is visible. It is sent when the
// visitor navigates away, hides the tab or closes the page.

const MIN_MS = 500; // ignore accidental loads and React development double-mounts
const MAX_MS = 30 * 60 * 1000;
const ENDPOINT = "/api/metrics/page-view";

function report(path, durationMs) {
  const rounded = Math.round(durationMs);
  if (rounded < MIN_MS) return;
  const body = JSON.stringify({ path, durationMs: Math.min(rounded, MAX_MS) });
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // Monitoring must never break the page.
  }
}

export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
    let accumulated = 0;

    function flush() {
      if (visibleSince !== null) {
        accumulated += performance.now() - visibleSince;
        visibleSince = document.visibilityState === "visible" ? performance.now() : null;
      }
      report(pathname, accumulated);
      accumulated = 0;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush();
        visibleSince = null;
      } else {
        visibleSince = performance.now();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [pathname]);

  return null;
}
