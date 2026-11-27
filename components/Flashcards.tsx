"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card } from "@/lib/cards";

const KEY = "prodscope.cardsKnown";

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function Flashcards({ cards, deckId }: { cards: Card[]; deckId: string }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "term" | "number" | "concept">("all");

  useEffect(() => {
    try {
      setKnown(JSON.parse(localStorage.getItem(KEY) || "{}")[deckId] ?? []);
    } catch {}
  }, [deckId]);
  const saveKnown = (next: string[]) => {
    setKnown(next);
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || "{}");
      all[deckId] = next;
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  };

  const visible = useMemo(() => order.filter((n) => filter === "all" || cards[n].kind === filter), [order, filter, cards]);
  const idx = visible[Math.min(i, visible.length - 1)];
  const card = idx === undefined ? null : cards[idx];
  const id = card ? card.front : "";
  const isKnown = known.includes(id);

  const move = (d: number) => {
    setFlipped(false);
    setI((x) => (visible.length ? (x + d + visible.length) % visible.length : 0));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === " ") (e.preventDefault(), setFlipped((f) => !f));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flash">
      <div className="flash-bar">
        {(["all", "concept", "number", "term"] as const).map((f) => (
          <button key={f} className={filter === f ? "on" : ""} onClick={() => (setFilter(f), setI(0), setFlipped(false))}>
            {f === "all" ? "All" : f === "term" ? "Terms" : f === "number" ? "Numbers" : "Concepts"}
          </button>
        ))}
        <button onClick={() => (setOrder(shuffle(order)), setI(0), setFlipped(false))}>Shuffle</button>
        <span className="flash-count">
          {known.filter((k) => cards.some((c) => c.front === k)).length} of {cards.length} known
        </span>
      </div>
      {card ? (
        <>
          <button className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-label="Flip card">
            <span className="fc-kind">{card.kind === "term" ? "Term" : card.kind === "number" ? "Number" : "Concept"} · {Math.min(i, visible.length - 1) + 1} / {visible.length}</span>
            {!flipped ? (
              <span className="fc-front">{card.front}</span>
            ) : (
              <span className="fc-back">
                <b>{card.back}</b>
                {card.note && <small>{card.note}</small>}
              </span>
            )}
            <span className="fc-hint">{flipped ? "Tap to see the question" : "Tap to see the answer"}</span>
          </button>
          <div className="flash-nav">
            <button onClick={() => move(-1)}>← Back</button>
            <button className={isKnown ? "known on" : "known"} onClick={() => saveKnown(isKnown ? known.filter((k) => k !== id) : [...known, id])}>
              {isKnown ? "✓ I know this" : "I know this"}
            </button>
            <button onClick={() => move(1)}>Next →</button>
          </div>
        </>
      ) : (
        <p className="hint">No cards of this type.</p>
      )}
    </div>
  );
}
