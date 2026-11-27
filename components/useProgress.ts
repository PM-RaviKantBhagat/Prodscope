"use client";

import { useCallback, useEffect, useState } from "react";

/** Saved and studied teardowns, kept in this browser only (no login). */
export type Progress = { saved: string[]; studied: string[] };

const KEY = "prodscope.progress";
const EVENT = "prodscope-progress";
const empty: Progress = { saved: [], studied: [] };

function read(): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && Array.isArray(v.saved) && Array.isArray(v.studied) ? v : empty;
  } catch {
    return empty;
  }
}

export function useProgress() {
  const [p, setP] = useState<Progress>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setP(read());
    setReady(true);
    const sync = () => setP(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = useCallback((list: keyof Progress, slug: string) => {
    const cur = read();
    const has = cur[list].includes(slug);
    const next = { ...cur, [list]: has ? cur[list].filter((s) => s !== slug) : [...cur[list], slug] };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setP(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { ...p, ready, toggle };
}
