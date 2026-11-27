"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BOTS, type Level } from "./bots";

export const USER_DPS = [
  "/dps/dp-1.jpg",
  "/dps/dp-2.jpg",
  "/dps/dp-3.jpg",
  "/dps/dp-4.jpg",
  "/dps/dp-5.jpg",
] as const;

type Settings = { theme: "light" | "dark"; levels: Record<string, Level>; avatar: string };
type Ctx = {
  s: Settings;
  setTheme: (t: Settings["theme"]) => void;
  setLevel: (id: string, l: Level) => void;
  setAvatar: (url: string) => void;
};

const KEY = "madbots:settings";
const base: Settings = {
  theme: "light",
  levels: Object.fromEntries(BOTS.map((b) => [b.id, b.level])),
  avatar: USER_DPS[0],
};
const C = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(base);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let next: Settings = { ...base, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved)
        next = {
          theme: saved.theme === "dark" ? "dark" : "light",
          levels: { ...base.levels, ...saved.levels },
          avatar: typeof saved.avatar === "string" && saved.avatar ? saved.avatar : USER_DPS[0],
        };
    } catch {}
    setS(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", s.theme === "dark");
    const color = s.theme === "dark" ? "#1c1f24" : "#ffffff";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute("content", color);
    });
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, [s, ready]);

  const value: Ctx = {
    s,
    setTheme: (theme) => setS((p) => ({ ...p, theme })),
    setLevel: (id, l) => setS((p) => ({ ...p, levels: { ...p.levels, [id]: l } })),
    setAvatar: (avatar) => setS((p) => ({ ...p, avatar })),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useSettings() {
  const c = useContext(C);
  if (!c) throw new Error("useSettings must be used inside SettingsProvider");
  return c;
}
