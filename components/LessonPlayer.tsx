"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lesson, Question } from "@/lib/learn/schema";
import { useLearn } from "./useLearn";

const LIVES = 3;
type Value = number[] | Record<number, number> | null;

function shuffle(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How many items the learner must pick, and whether the answer is right. */
function need(q: Question): number {
  if (q.type === "tree") return q.correct.length;
  if (q.type === "order") return q.steps.length;
  if (q.type === "match") return q.pairs.length;
  return 1;
}
function isRight(q: Question, v: Value, order: number[]): boolean {
  if (!v) return false;
  const picks = Array.isArray(v) ? v.map((i) => order[i]) : [];
  switch (q.type) {
    case "mcq": return picks[0] === q.answer;
    case "tf": return (picks[0] === 0) === q.answer;
    case "spot": return picks[0] === q.wrong;
    case "tree": return picks.length === q.correct.length && picks.every((p) => q.correct.includes(p));
    case "order": return picks.every((p, i) => p === i);
    // Compare text, so two pairs with the same answer (like "Input") both count.
    case "match": return q.pairs.every((p, left) => q.pairs[order[(v as Record<number, number>)[left]]]?.right === p.right);
  }
}
function options(q: Question): string[] {
  switch (q.type) {
    case "mcq": return q.options;
    case "tf": return ["True", "False"];
    case "spot": return q.lines;
    case "tree": return q.options;
    case "order": return q.steps;
    case "match": return q.pairs.map((p) => p.right);
  }
}
function rightAnswer(q: Question): string {
  switch (q.type) {
    case "mcq": return q.options[q.answer];
    case "tf": return q.answer ? "True" : "False";
    case "spot": return `The wrong one: ${q.lines[q.wrong]}`;
    case "tree": return q.correct.map((i) => q.options[i]).join(" + ");
    case "order": return q.steps.map((s, i) => `${i + 1}. ${s}`).join("  ");
    case "match": return q.pairs.map((p) => `${p.left} → ${p.right}`).join("  ·  ");
  }
}

function Ask({ q, order, value, setValue, locked }: { q: Question; order: number[]; value: Value; setValue: (v: Value) => void; locked: boolean }) {
  const opts = options(q);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => setLeft(null), [q]);

  if (q.type === "match") {
    const map = (value as Record<number, number>) || {};
    const usedRight = new Set(Object.values(map));
    const pickRight = (r: number) => {
      if (locked || left === null) return;
      const next = { ...map };
      for (const k of Object.keys(next)) if (next[+k] === r) delete next[+k];
      next[left] = r;
      setValue(next);
      setLeft(null);
    };
    return (
      <div className="m-grid">
        <div>
          {q.pairs.map((p, i) => (
            <button key={i} className={`g-card m ${left === i ? "on" : ""} ${map[i] !== undefined ? "paired" : ""}`} disabled={locked} onClick={() => {
              if (map[i] !== undefined) { const n = { ...map }; delete n[i]; setValue(n); }
              setLeft(i);
            }}>
              <span>{p.left}</span>
              {map[i] !== undefined && <small className="m-to">→ {opts[order[map[i]]]}</small>}
            </button>
          ))}
        </div>
        <div>
          {order.map((orig, i) => (
            <button key={i} className={`g-card m ${usedRight.has(i) ? "used" : ""}`} disabled={locked || left === null} onClick={() => pickRight(i)}>
              <span>{opts[orig]}</span>
            </button>
          ))}
        </div>
        {!locked && <p className="hint m-hint">{left === null ? "Tap an item on the left, then its match on the right." : `Now pick the match for "${q.pairs[left].left}".`}</p>}
      </div>
    );
  }

  if (q.type === "order") {
    const seq = (value as number[]) || [];
    return (
      <div>
        <ol className="o-seq">
          {seq.map((i, n) => (
            <li key={i}><button className="g-card on" disabled={locked} onClick={() => setValue(seq.filter((x) => x !== i))}><kbd>{n + 1}</kbd><span>{opts[order[i]]}</span></button></li>
          ))}
          {seq.length < opts.length && <li className="o-empty">Tap the steps below in the right order</li>}
        </ol>
        <div className="g-cards">
          {order.map((orig, i) => !seq.includes(i) && (
            <button key={i} className="g-card" disabled={locked} onClick={() => setValue([...seq, i])}><span>{opts[orig]}</span></button>
          ))}
        </div>
      </div>
    );
  }

  const max = need(q);
  const picks = (value as number[]) || [];
  return (
    <div>
      {q.type === "tree" && <div className="t-root">{q.root}<small>Pick {max} that directly drive it</small></div>}
      <div className={`g-cards ${q.type === "tf" ? "tf" : ""}`}>
        {order.map((orig, i) => {
          const on = picks.includes(i);
          return (
            <button key={i} className={`g-card ${on ? "on" : ""}`} disabled={locked} aria-pressed={on}
              onClick={() => setValue(max === 1 ? [i] : on ? picks.filter((x) => x !== i) : picks.length < max ? [...picks, i] : picks)}>
              <span>{opts[orig]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LessonPlayer({ lesson, unitTitle, next }: { lesson: Lesson; unitTitle: string; next?: string }) {
  const { record } = useLearn();
  const [phase, setPhase] = useState<"teach" | "play" | "lost" | "won">("teach");
  const [card, setCard] = useState(0);
  const [queue, setQueue] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [hearts, setHearts] = useState(LIVES);
  const [value, setValue] = useState<Value>(null);
  const [result, setResult] = useState<null | "right" | "wrong">(null);
  const [firstTry, setFirstTry] = useState(0);
  const [earned, setEarned] = useState(0);

  const qi = queue[pos];
  const q = qi === undefined ? null : lesson.questions[qi];
  const order = useMemo(() => (q ? (q.type === "tf" ? [0, 1] : shuffle(options(q).length)) : []), [q, pos]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = value ? (Array.isArray(value) ? value.length : Object.keys(value).length) : 0;
  const ready = q ? count === need(q) : false;

  const start = () => {
    setQueue(lesson.questions.map((_, i) => i));
    setPos(0);
    setHearts(LIVES);
    setValue(null);
    setResult(null);
    setFirstTry(0);
    setPhase("play");
  };
  const check = () => {
    if (!q || !ready || result) return;
    const ok = isRight(q, value, order);
    setResult(ok ? "right" : "wrong");
    if (ok && pos < lesson.questions.length) setFirstTry((n) => n + 1);
    if (!ok) {
      setHearts((h) => h - 1);
      setQueue((qq) => [...qq, qi]);
    }
  };
  const advance = () => {
    if (!result) return;
    if (hearts <= 0) {
      const xp = firstTry * 2;
      setEarned(xp);
      record(xp);
      return setPhase("lost");
    }
    if (pos + 1 >= queue.length) {
      const xp = 10 + firstTry * 2 + hearts * 5;
      setEarned(xp);
      record(xp, { lesson: lesson.id, stars: hearts });
      return setPhase("won");
    }
    setPos(pos + 1);
    setValue(null);
    setResult(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (phase === "play") (result ? advance() : check());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "teach")
    return (
      <div className="game">
        <div className="g-top">
          <Link href="/learn" className="g-x" aria-label="Back to lessons">✕</Link>
          <div className="g-bar"><i style={{ width: "0%" }} /></div>
        </div>
        <p className="eyebrow">{unitTitle}</p>
        <h1>{lesson.title}</h1>
        <div className="teach-card">
          <small>{card + 1} of {lesson.teach.length}</small>
          <p>{lesson.teach[card]}</p>
        </div>
        <div className="g-foot">
          {card + 1 < lesson.teach.length
            ? <button className="btn" onClick={() => setCard(card + 1)} autoFocus>Next</button>
            : <button className="btn" onClick={start} autoFocus>Start the questions</button>}
        </div>
      </div>
    );

  if (phase === "lost")
    return (
      <div className="game g-end lost">
        <div className="g-badge">💔</div>
        <h1>Out of lives.</h1>
        <p className="lede">No problem, that is how you learn. Read the cards again and have another go. +{earned} XP.</p>
        <div className="g-actions">
          <button className="btn" onClick={() => { setCard(0); setPhase("teach"); }} autoFocus>Try again</button>
          <Link className="btn ghost" href="/learn">Back to lessons</Link>
        </div>
      </div>
    );

  if (phase === "won")
    return (
      <div className="game g-end won">
        <div className="g-stars">{[1, 2, 3].map((i) => <span key={i} className={i <= hearts ? "on" : ""}>★</span>)}</div>
        <h1>Lesson complete!</h1>
        <p className="lede">+{earned} XP. {firstTry} of {lesson.questions.length} right on the first try.</p>
        <div className="g-actions">
          {next ? <Link className="btn" href={`/learn/${next}`}>Next lesson</Link> : <Link className="btn" href="/play">Play a product</Link>}
          <Link className="btn ghost" href="/learn">Back to lessons</Link>
        </div>
      </div>
    );

  if (!q) return null;
  return (
    <div className="game">
      <div className="g-top">
        <Link href="/learn" className="g-x" aria-label="Quit lesson">✕</Link>
        <div className="g-bar"><i style={{ width: `${(pos / queue.length) * 100}%` }} /></div>
        <span className="g-hearts">{Array.from({ length: LIVES }, (_, i) => <i key={i} className={i < hearts ? "on" : ""}>♥</i>)}</span>
      </div>
      <p className="eyebrow">{pos >= lesson.questions.length ? "Second chance" : lesson.title}</p>
      <h2 className="g-prompt">{q.prompt}</h2>
      <Ask key={`${pos}`} q={q} order={order} value={value} setValue={setValue} locked={!!result} />
      <div className={`g-foot ${result ?? ""}`}>
        {result === "right" && <div><b>Nice!</b><p>{q.explain}</p></div>}
        {result === "wrong" && <div><b>Not quite. Answer: {rightAnswer(q)}</b><p>{q.explain}</p></div>}
        {!result
          ? <button className="btn" onClick={check} disabled={!ready}>Check</button>
          : <button className="btn" onClick={advance} autoFocus>{hearts <= 0 ? "Continue" : "Continue"}</button>}
      </div>
    </div>
  );
}
