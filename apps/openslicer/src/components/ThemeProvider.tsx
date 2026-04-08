"use client";

import { useEffect } from "react";
import { useThemeStore } from "../stores/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Listen for system theme changes when mode is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      // Re-trigger resolution when system preference changes
      setTheme("system");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme, setTheme]);

  // Apply dark class on mount (handles SSR → client hydration)
  useEffect(() => {
    const resolved = useThemeStore.getState().resolvedTheme;
    const root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  return <>{children}</>;
}
