import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type Accent = "emerald" | "midnight" | "noir" | "ocean";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  resolved: "light" | "dark";
}

const Ctx = createContext<ThemeCtx | null>(null);
const THEME_KEY = "tutorshield_theme";
const ACCENT_KEY = "tutorshield_accent";

export const accents: { id: Accent; label: string; swatch: string[] }[] = [
  { id: "emerald", label: "Emerald Prestige", swatch: ["#064e3b", "#0d7a5f", "#c9a84c"] },
  { id: "midnight", label: "Midnight Indigo", swatch: ["#0a0a1a", "#1e1e5a", "#4f46e5"] },
  { id: "noir", label: "Noir & Gold", swatch: ["#0d0d0d", "#c9a84c", "#f0d78c"] },
  { id: "ocean", label: "Ocean Deep", swatch: ["#0c2340", "#2d8a9e", "#5cbdb9"] },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [accent, setAccentState] = useState<Accent>("emerald");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const t = (localStorage.getItem(THEME_KEY) as Theme) || "light";
      const a = (localStorage.getItem(ACCENT_KEY) as Accent) || "emerald";
      setThemeState(t);
      setAccentState(a);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && mq.matches);
      root.classList.toggle("dark", isDark);
      setResolved(isDark ? "dark" : "light");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // ignore storage errors
    }
  };
  const setAccent = (a: Accent) => {
    setAccentState(a);
    try {
      localStorage.setItem(ACCENT_KEY, a);
    } catch {
      // ignore storage errors
    }
  };

  return <Ctx.Provider value={{ theme, setTheme, accent, setAccent, resolved }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}
