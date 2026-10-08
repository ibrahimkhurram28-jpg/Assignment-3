"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const [density, setDensityState] = useState("comfortable");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedTheme = readCookie("phoneme-theme");
    const savedDensity = readCookie("phoneme-density");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    // Reading the saved cookie / OS preference is a one-time sync with an
    // external system on mount, so this effect intentionally sets state.
    /* eslint-disable react-hooks/set-state-in-effect */
    setThemeState(initialTheme);
    setDensityState(savedDensity || "comfortable");
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-density", density);
  }, [theme, density, ready]);

  function setTheme(next) {
    setThemeState(next);
    writeCookie("phoneme-theme", next);
  }

  function setDensity(next) {
    setDensityState(next);
    writeCookie("phoneme-density", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
