"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Game } from "@/lib/learn/games";
import { useLearn } from "./useLearn";

type Card = { text: string; ok: boolean; from?: string };
type Step = { scene: number; ok: boolean; picked: Card[] };
const LIVES = 3;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

type View = { prompt: string; right: string[]; win: string };
/** The version of a round used in this attempt (each round can have several right answers). */
function view(game: Game, i: number, v: number): View {
  const s = game.scenes[i];
  const alt = v > 0 ? s.alts?.[v - 1] : undefined;
  return alt ? { prompt: alt.prompt ?? s.prompt, right: alt.right, win: alt.win } : { prompt: s.prompt, right: s.right, win: s.win };
}

function dealCards(game: Game, i: number, v: number): Card[] {
  const s = { ...game.scenes[i], ...view(game, i, v) };
  const wrong = shuffle(s.wrong).slice(0, 4).map((w) => ({ text: w.text, ok: false, from: w.from }));
  return shuffle([...s.right.map((text) => ({ text, ok: true })), ...wrong]);
}

const Hearts = ({ n }: { n: number }) => (
  <span className="g-hearts" aria-label={`${n} lives left`}>
    {Array.from({ length: LIVES }, (_, i) => (
      <i key={i} className={i < n ? "on" : ""}>♥</i>
    ))}
  </span>
);

export default function ProductGame({ game, next }: { game: Game; next: string }) {
  const { record } = useLearn();
  const [phase, setPhase] = useState<"intro" | "play" | "lost" | "won">("intro");
  const [queue, setQueue] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [hearts, setHearts] = useState(LIVES);
  const [cards, setCards] = useState<Card[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<null | "right" | "wrong">(null);
  const [log, setLog] = useState<Step[]>([]);
  const [earned, setEarned] = useState(0);

  const sceneIdx = queue[pos];
  const [picks, setPicks] = useState<number[]>([]);
  const base = sceneIdx === undefined ? null : game.scenes[sceneIdx];
  const scene = base ? { ...base, ...view(game, sceneIdx, picks[sceneIdx] ?? 0) } : null;
  const need = scene?.right.length ?? 1;
  const retry = pos >= game.scenes.length;

  const start = useCallback(() => {
    // New attempt, new game: a fresh order of rounds (first and last stay put, they frame the story)
    // and a fresh right answer for every round that has more than one.
    const n = game.scenes.length;
    const q = [0, ...shuffle(Array.from({ length: n - 2 }, (_, i) => i + 1)), n - 1];
    const v = game.scenes.map((s) => Math.floor(Math.random() * ((s.alts?.length ?? 0) + 1)));
    setPicks(v);
    setQueue(q);
    setPos(0);
    setHearts(LIVES);
    setLog([]);
    setPicked([]);
    setResult(null);
    setCards(dealCards(game, q[0], v[0]));
    setPhase("play");
    window.scrollTo({ top: 0 });
  }, [game]);

  const toggle = (i: number) => {
    if (result) return;
    if (!scene?.multi) return setPicked([i]);
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < need ? [...p, i] : p));
  };

  const check = () => {
    if (!scene || result || picked.length !== need) return;
    const chosen = picked.map((i) => cards[i]);
    const ok = chosen.every((c) => c.ok);
    setResult(ok ? "right" : "wrong");
    setLog((l) => [...l, { scene: sceneIdx, ok, picked: chosen }]);
    if (!ok) {
      setHearts((h) => h - 1);
      // A wrong call comes back at the end as a second chance, like Duolingo.
      setQueue((q) => [...q, sceneIdx]);
    }
  };

  const finish = (won: boolean, livesLeft: number, steps: Step[]) => {
    const right = steps.filter((s) => s.ok).length;
    const xp = right * 10 + (won ? 30 + livesLeft * 10 : 0);
    setEarned(xp);
    record(xp, { game: game.slug, stars: won ? livesLeft : 0 });
    setPhase(won ? "won" : "lost");
    window.scrollTo({ top: 0 });
  };

  const advance = () => {
    if (!result) return;
    if (hearts <= 0) return finish(false, 0, log);
    if (pos + 1 >= queue.length) return finish(true, hearts, log);
    const n = pos + 1;
    setPos(n);
    setCards(dealCards(game, queue[n], picks[queue[n]] ?? 0));
    setPicked([]);
    setResult(null);
  };

  // Keys: 1-6 pick a card, Enter checks or continues.
  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const n = Number(e.key);
      if (n >= 1 && n <= cards.length) toggle(n - 1);
      if (e.key === "Enter") (result ? advance() : check());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "intro")
    return (
      <div className="game g-intro">
        <p className="eyebrow">Play the product · {game.section}</p>
        <h1>You are the new PM of {game.company}.</h1>
        <p className="lede">{game.summary}</p>
        <ul className="g-rules">
          <li><b>{game.scenes.length} big calls</b> about users, money, metrics, growth and a crisis.</li>
          <li><b>3 lives.</b> A wrong call costs a life and you see what happens. It comes back at the end for a second try.</li>
          <li><b>Win</b> by getting every call right before your lives run out.</li>
        </ul>
        <button className="btn" onClick={start} autoFocus>Start the game</button>
      </div>
    );

  if (phase === "lost")
    return (
      <div className="game g-end lost">
        <div className="g-badge">💥</div>
        <h1>{game.company} ran out of runway.</h1>
        <p className="lede">You made {log.filter((l) => !l.ok).length} wrong calls. Here is the path you took. Read the hints, then try again. Earned {earned} XP.</p>
        <ol className="g-path">
          {log.map((l, i) => (
            <li key={i} className={l.ok ? "ok" : "no"}>
              <b>{l.ok ? "✓" : "✗"} {game.scenes[l.scene].title}</b>
              {l.ok ? <span>{l.picked.map((c) => c.text).join(" + ")}</span> : <span>{game.scenes[l.scene].lose}</span>}
            </li>
          ))}
        </ol>
        <div className="g-actions">
          <button className="btn" onClick={start} autoFocus>Try again</button>
          <Link className="btn ghost" href={`/t/${game.slug}`}>Study the teardown first</Link>
        </div>
      </div>
    );

  if (phase === "won")
    return (
      <div className="game g-end won">
        <div className="g-stars" aria-label={`${hearts} of 3 stars`}>
          {[1, 2, 3].map((i) => <span key={i} className={i <= hearts ? "on" : ""}>★</span>)}
        </div>
        <h1>You won {game.company}!</h1>
        <p className="lede">+{earned} XP. {hearts === LIVES ? "Flawless, not a single wrong call." : `You lost ${LIVES - hearts} ${LIVES - hearts === 1 ? "life" : "lives"} on the way.`}</p>
        <h2>The winning path</h2>
        <ol className="g-path">
          {queue.filter((x, i) => queue.indexOf(x) === i).map((si) => {
            const s = { ...game.scenes[si], ...view(game, si, picks[si] ?? 0) };
            return (
            <li key={si} className="ok">
              <b>{s.title}</b>
              <span className="g-answer">{s.right.join(" + ")}</span>
              <span>{s.win}</span>
            </li>
            );
          })}
        </ol>
        {game.lessons.length > 0 && (
          <>
            <h2>What a PM learns from {game.company}</h2>
            <ul className="g-lessons">{game.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </>
        )}
        <div className="g-actions">
          <Link className="btn" href={`/play/${next}`}>Play another product</Link>
          <Link className="btn ghost" href={`/t/${game.slug}`}>Read the full teardown</Link>
          <Link className="btn ghost" href={`/cards/${game.slug}`}>Flashcards</Link>
          <Link className="btn ghost" href="/play">All games</Link>
        </div>
      </div>
    );

  if (!scene) return null;
  const done = pos;
  return (
    <div className="game">
      <div className="g-top">
        <Link href="/play" className="g-x" aria-label="Quit game">✕</Link>
        <div className="g-bar"><i style={{ width: `${(done / queue.length) * 100}%` }} /></div>
        <Hearts n={hearts} />
      </div>
      <p className="eyebrow">{retry ? "Second chance · " : ""}{scene.title} · {game.company}</p>
      <h2 className="g-prompt">{scene.prompt}</h2>
      {scene.multi && <p className="hint">Pick {need}.</p>}
      <div className="g-cards" role="group">
        {cards.map((c, i) => {
          const on = picked.includes(i);
          const cls = ["g-card", on ? "on" : "", result === "right" && on ? "right" : "", result === "wrong" && on && !c.ok ? "wrong" : ""].join(" ");
          return (
            <button key={c.text} className={cls} onClick={() => toggle(i)} disabled={!!result} aria-pressed={on}>
              <kbd>{i + 1}</kbd>
              <span>{c.text}</span>
              {result === "wrong" && on && !c.ok && c.from && <small>That's from {c.from}'s playbook.</small>}
            </button>
          );
        })}
      </div>
      <div className={`g-foot ${result ?? ""}`}>
        {result === "right" && <div><b>Good call!</b><p>{scene.win}</p></div>}
        {result === "wrong" && <div><b>Wrong path. You lose a life.</b><p>{scene.lose}</p></div>}
        {!result ? (
          <button className="btn" onClick={check} disabled={picked.length !== need}>Lock it in</button>
        ) : (
          <button className="btn" onClick={advance} autoFocus>{hearts <= 0 ? "See what happened" : "Continue"}</button>
        )}
      </div>
    </div>
  );
}
