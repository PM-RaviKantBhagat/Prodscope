"use client";

import { useCallback, useEffect, useState } from "react";

/** Game progress, kept in this browser only (no login). */
export type LearnState = {
  xp: number;
  /** XP earned per day, by local date (YYYY-MM-DD). */
  days: Record<string, number>;
  /** Best result per product game: stars 0-3 (0 = played, not won yet). */
  games: Record<string, number>;
  /** Best result per lesson: stars 1-3. */
  lessons: Record<string, number>;
};

const KEY = "prodscope.learn";
const EVENT = "prodscope-learn";
const empty: LearnState = { xp: 0, days: {}, games: {}, lessons: {} };
export const DAILY_GOAL = 50;
export const XP_PER_LEVEL = 150;

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function read(): LearnState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.xp === "number" ? { ...empty, ...v } : empty;
  } catch {
    return empty;
  }
}

/** Days in a row with any XP, ending today (or yesterday, so a streak isn't lost before you play today). */
export function streakOf(s: LearnState): number {
  const d = new Date();
  if (!s.days[today(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (s.days[today(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export type Badge = { id: string; icon: string; name: string; how: string; got: boolean };

export function badgesOf(s: LearnState, sections: Record<string, string[]> = {}): Badge[] {
  const product = Object.entries(s.games).filter(([k]) => !k.startsWith("build:")).map(([, v]) => v);
  const built = Object.entries(s.games).filter(([k, v]) => k.startsWith("build:") && v === 3).length;
  const wins = product.filter((v) => v > 0).length;
  const flawless = product.filter((v) => v === 3).length;
  const streak = streakOf(s);
  const best = Math.max(0, ...Object.keys(s.days).map((d) => s.days[d]));
  const fullCat = Object.values(sections).some((slugs) => slugs.length > 0 && slugs.every((x) => (s.games[x] ?? 0) > 0));
  return [
    { id: "first", icon: "🚀", name: "First launch", how: "Win your first product game", got: wins >= 1 },
    { id: "five", icon: "🧭", name: "Explorer", how: "Win 5 product games", got: wins >= 5 },
    { id: "twentyfive", icon: "🗺️", name: "Product mapper", how: "Win 25 product games", got: wins >= 25 },
    { id: "flawless", icon: "💎", name: "Flawless", how: "Win a game without losing a life", got: flawless >= 1 },
    { id: "lessons", icon: "📘", name: "Student", how: "Finish 4 skill lessons", got: Object.keys(s.lessons).length >= 4 },
    { id: "streak3", icon: "🔥", name: "On fire", how: "Play 3 days in a row", got: streak >= 3 },
    { id: "streak7", icon: "⚡", name: "Week warrior", how: "Play 7 days in a row", got: streak >= 7 },
    { id: "goal", icon: "🎯", name: "Overachiever", how: `Earn ${DAILY_GOAL * 3} XP in one day`, got: best >= DAILY_GOAL * 3 },
    { id: "founder", icon: "🏗️", name: "Founder", how: "Win a Build a product story", got: built >= 1 },
    { id: "category", icon: "🏆", name: "Category master", how: "Win every game in one category", got: fullCat },
  ];
}

export function useLearn() {
  const [s, setS] = useState<LearnState>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setS(read());
    setReady(true);
    const sync = () => setS(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /** Add XP and record a result. Keeps the best stars. */
  const record = useCallback((xp: number, result?: { game?: string; lesson?: string; stars: number }) => {
    const cur = read();
    const t = today();
    const next: LearnState = { ...cur, xp: cur.xp + xp, days: { ...cur.days, [t]: (cur.days[t] ?? 0) + xp }, games: { ...cur.games }, lessons: { ...cur.lessons } };
    if (result?.game) next.games[result.game] = Math.max(next.games[result.game] ?? 0, result.stars);
    if (result?.lesson) next.lessons[result.lesson] = Math.max(next.lessons[result.lesson] ?? 0, result.stars);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setS(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return {
    ...s,
    ready,
    record,
    streak: streakOf(s),
    level: 1 + Math.floor(s.xp / XP_PER_LEVEL),
    levelXp: s.xp % XP_PER_LEVEL,
    todayXp: s.days[today()] ?? 0,
  };
}
