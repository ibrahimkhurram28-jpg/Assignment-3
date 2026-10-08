"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const { theme, setTheme, density, setDensity } = useTheme();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Settings</h1>
      <p className="mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Interface preferences are saved to a cookie in this browser and applied across every page.
      </p>

      <section className="card p-5 mb-5">
        <h2 className="font-semibold mb-3">Theme</h2>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn"
            style={
              theme === "light"
                ? { background: "var(--color-primary)", color: "var(--color-surface)" }
                : { background: "transparent", border: "1px solid var(--color-border)" }
            }
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
          >
            ☀️ Light
          </button>
          <button
            type="button"
            className="btn"
            style={
              theme === "dark"
                ? { background: "var(--color-primary)", color: "var(--color-surface)" }
                : { background: "transparent", border: "1px solid var(--color-border)" }
            }
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
          >
            🌙 Dark
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Layout density</h2>
        <p className="text-sm mb-3" style={{ color: "var(--color-ink-soft)" }}>
          Compact tightens spacing across the builder forms, useful on smaller screens.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn"
            style={
              density === "comfortable"
                ? { background: "var(--color-primary)", color: "var(--color-surface)" }
                : { background: "transparent", border: "1px solid var(--color-border)" }
            }
            onClick={() => setDensity("comfortable")}
            aria-pressed={density === "comfortable"}
          >
            Comfortable
          </button>
          <button
            type="button"
            className="btn"
            style={
              density === "compact"
                ? { background: "var(--color-primary)", color: "var(--color-surface)" }
                : { background: "transparent", border: "1px solid var(--color-border)" }
            }
            onClick={() => setDensity("compact")}
            aria-pressed={density === "compact"}
          >
            Compact
          </button>
        </div>
      </section>
    </div>
  );
}
