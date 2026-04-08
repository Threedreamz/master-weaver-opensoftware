"use client";

import { create } from "zustand";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return getSystemTheme();
  return theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("openslicer-theme");
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "dark";
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getStoredTheme();
  const resolved = resolveTheme(initial);

  // Apply on creation (client-side)
  applyTheme(resolved);

  return {
    theme: initial,
    resolvedTheme: resolved,
    setTheme: (theme: Theme) => {
      const resolved = resolveTheme(theme);
      localStorage.setItem("openslicer-theme", theme);
      applyTheme(resolved);
      set({ theme, resolvedTheme: resolved });
    },
  };
});
