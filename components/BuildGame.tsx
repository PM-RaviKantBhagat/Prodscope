"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { choose, due, failed, grade, revenue, start, type Effects, type Game, type Option, type Scenario, type Stage, type Stats } from "@/lib/sim/engine";
import { useLearn } from "./useLearn";

type Step = { stage: Stage; option: Option; before: Stats; after: Stats; event?: boolean };
type Phase = "intro" | "choose" | "result" | "over" | "end";

const lakh = (n: number) => (Math.abs(n) >= 100 ? `₹${(n / 100).toFixed(1)} Cr` : `₹${n.toFixed(1)} L`);
const fmt = (n: number) => n.toLocaleString("en-IN");
const LABEL: Record<string, string> = { cash: "Cash", burn: "Monthly costs", users: "Users", growth: "Growth", retention: "Retention", arpu: "Money per user", trust: "Trust", morale: "Team morale" };
// For costs, going up is bad.
const goodUp = (k: string) => k !== "burn";

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function Chips({ e }: { e: Effects }) {
  const items = Object.entries(e).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <div className="b-chips">
      {items.map(([k, v]) => {
        const good = (v as number) > 0 === goodUp(k);
        const val = k === "cash" || k === "burn" ? lakh(Math.abs(v as number)) : k === "users" ? fmt(Math.abs(v as number)) : k === "arpu" ? `₹${Math.abs(v as number)}` : `${Math.abs(v as number)}${k === "growth" || k === "retention" ? " pts" : ""}`;
        return <span key={k} className={good ? "up" : "down"}>{(v as number) > 0 ? "▲" : "▼"} {LABEL[k]} {val}</span>;
      })}
    </div>
  );
}

function Dashboard({ s, sc }: { s: Stats; sc: Scenario }) {
  const rev = revenue(s);
  const net = rev - s.burn;
  const runway = net >= 0 ? "∞" : `${Math.max(0, Math.floor(s.cash / -net))} mo`;
  const meter = (v: number) => <span className="b-meter"><i style={{ width: `${v}%`, background: v < 30 ? "var(--high)" : v < 50 ? "var(--med)" : "var(--low)" }} /></span>;
  return (
    <div className="b-dash">
      <div><small>Month</small><b>{s.month}</b></div>
      <div><small>Cash</small><b className={s.cash < 50 ? "warn" : ""}>{lakh(s.cash)}</b><em>runway {runway}</em></div>
      <div><small>Money in / out</small><b className={net < 0 ? "warn" : "ok"}>{lakh(rev)} / {lakh(s.burn)}</b><em>per month</em></div>
      <div><small>Users</small><b>{fmt(s.users)}</b><em>goal {fmt(sc.goals.users)}</em></div>
      <div><small>Growth / retention</small><b>{s.growth}% / {s.retention}%</b><em>per month</em></div>
      <div><small>Money per user</small><b className={s.arpu < 0 ? "warn" : ""}>₹{s.arpu}</b><em>per month</em></div>
      <div><small>Trust {Math.round(s.trust)}</small>{meter(s.trust)}</div>
      <div><small>Team morale {Math.round(s.morale)}</small>{meter(s.morale)}</div>
    </div>
  );
}

function Chart({ g, sc }: { g: Game; sc: Scenario }) {
  const h = g.history;
  if (h.length < 2) return null;
  const W = 600, H = 160, maxM = h[h.length - 1].month || 1;
  const maxU = Math.max(sc.goals.users, ...h.map((x) => x.users));
  const maxC = Math.max(...h.map((x) => x.cash), 1);
  const x = (m: number) => (m / maxM) * W;
  const line = (f: (p: (typeof h)[0]) => number) => h.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)},${f(p).toFixed(1)}`).join(" ");
  return (
    <figure className="b-chart">
      <svg viewBox={`0 0 ${W} ${H + 10}`} role="img" aria-label="Users and cash over time">
        <line x1="0" x2={W} y1={H - (sc.goals.users / maxU) * H} y2={H - (sc.goals.users / maxU) * H} className="goal" />
        <path d={line((p) => H - (p.users / maxU) * H)} className="users" />
        <path d={line((p) => H - (Math.max(0, p.cash) / maxC) * H)} className="cash" />
      </svg>
      <figcaption><span className="k users" /> Users <span className="k cash" /> Cash <span className="k goal" /> User goal</figcaption>
    </figure>
  );
}

export default function BuildGame({ sc }: { sc: Scenario }) {
  const { record } = useLearn();
  const [phase, setPhase] = useState<Phase>("intro");
  const [g, setG] = useState<Game>(() => start(sc));
  const [i, setI] = useState(0); // main stage index
  const [event, setEvent] = useState<Stage | null>(null);
  const [usedEvents, setUsedEvents] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [notes, setNotes] = useState<{ note: string; effects: Effects }[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [last, setLast] = useState<Step | null>(null);
  const [xp, setXp] = useState(0);

  const stage = event ?? sc.stages[i];
  const result = useMemo(() => (phase === "end" ? grade(sc, g.stats) : null), [phase, sc, g]);
  const fail = phase === "over" ? failed(g.stats) : null;

  const enterStage = (game: Game, idx: number) => {
    const d = due(game, idx);
    setG(d.game);
    setNotes(d.notes);
    setI(idx);
    setEvent(null);
    setOrder(shuffle(sc.stages[idx].options.map((_, k) => k)));
    setPhase("choose");
    window.scrollTo({ top: 0 });
  };

  const begin = () => {
    setSteps([]);
    setUsedEvents([]);
    setLast(null);
    enterStage(start(sc), 0);
  };

  const pick = (k: number) => {
    const option = stage.options[k];
    const before = g.stats;
    const next = choose(sc, g, stage, option, i);
    const step = { stage, option, before, after: next.stats, event: !!event };
    setG(next);
    setSteps((s) => [...s, step]);
    setLast(step);
    setPhase("result");
    window.scrollTo({ top: 0 });
  };

  const finish = (won: boolean, stars: number) => {
    const earned = 20 + stars * 20 + (won ? 60 : 0);
    setXp(earned);
    record(earned, { game: `build:${sc.id}`, stars: won ? stars : 0 });
  };

  const next = () => {
    if (failed(g.stats)) {
      finish(false, 0);
      setPhase("over");
      return window.scrollTo({ top: 0 });
    }
    // A surprise may happen after some stages, once per kind of event.
    if (!event && sc.eventSlots.includes(i) && Math.random() < 0.6) {
      const left = sc.events.filter((e) => !usedEvents.includes(e.id));
      if (left.length) {
        const ev = left[Math.floor(Math.random() * left.length)];
        setUsedEvents((u) => [...u, ev.id]);
        setEvent(ev);
        setNotes([]);
        setOrder(shuffle(ev.options.map((_, k) => k)));
        setPhase("choose");
        return window.scrollTo({ top: 0 });
      }
    }
    if (i + 1 >= sc.stages.length) {
      const d = due(g, sc.stages.length);
      setG(d.game);
      const r = grade(sc, d.game.stats);
      finish(r.won, r.stars);
      setPhase("end");
      return window.scrollTo({ top: 0 });
    }
    enterStage(g, i + 1);
  };

  if (phase === "intro")
    return (
      <div className="build">
        <p className="eyebrow">Build a product · {sc.tagline}</p>
        <h1>{sc.icon} {sc.title}</h1>
        <p className="lede">{sc.pitch}</p>
        <div className="b-goals">
          <b>To win, by the end you need all three:</b>
          <ul>
            <li>At least {fmt(sc.goals.users)} monthly users</li>
            <li>Money coming in each month that covers your monthly costs</li>
            <li>Trust of {sc.goals.trust} or more</li>
          </ul>
          <b>You lose straight away if:</b>
          <ul>
            <li>cash runs out, trust falls to 15, or team morale falls to 15</li>
          </ul>
        </div>
        <p className="hint">{sc.stages.length} big decisions, from first research to the road to profit, plus surprises. You won&apos;t see the numbers behind a choice until you make it, and some choices come back to bite months later. Most people lose their first try.</p>
        <button className="btn" onClick={begin} autoFocus>Start building</button>
      </div>
    );

  if (phase === "over" || phase === "end") {
    const won = !!result?.won;
    return (
      <div className="build">
        {phase === "over" ? (
          <>
            <div className="g-badge">💥</div>
            <h1>{fail?.title}</h1>
            <p className="lede">{fail?.why} It happened in month {g.stats.month}, at stage {Math.min(i + 1, sc.stages.length)} of {sc.stages.length}. +{xp} XP.</p>
          </>
        ) : (
          <>
            <div className="g-stars">{[1, 2, 3].map((n) => <span key={n} className={n <= (result?.stars ?? 0) ? "on" : ""}>★</span>)}</div>
            <h1>{won ? `${sc.title} made it!` : `${sc.title} survived, but didn't hit every goal.`}</h1>
            <p className="lede">After {g.stats.month} months. +{xp} XP.</p>
            <ul className="b-checks">
              {result?.checks.map((c) => <li key={c.label} className={c.ok ? "ok" : "no"}>{c.ok ? "✓" : "✗"} {c.label}: <b>{c.value}</b></li>)}
            </ul>
          </>
        )}
        <Dashboard s={g.stats} sc={sc} />
        <Chart g={g} sc={sc} />
        <h2>Your decisions and what they teach</h2>
        <ol className="g-path">
          {steps.map((s, k) => (
            <li key={k} className={s.after.cash < s.before.cash * 0.5 || s.after.trust < s.before.trust - 8 ? "no" : "ok"}>
              <b>{s.event ? "Surprise: " : ""}{s.stage.title}</b>
              <span className="g-answer">{s.option.label}</span>
              <span>{s.option.lesson}</span>
            </li>
          ))}
        </ol>
        <div className="g-actions">
          <button className="btn" onClick={begin}>Play again</button>
          <Link className="btn ghost" href="/build">Other stories</Link>
          <Link className="btn ghost" href="/learn">Skill lessons</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="build">
      <div className="g-top">
        <Link href="/build" className="g-x" aria-label="Quit">✕</Link>
        <div className="g-bar"><i style={{ width: `${(i / sc.stages.length) * 100}%` }} /></div>
        <small className="b-step">{i + 1}/{sc.stages.length}</small>
      </div>
      <Dashboard s={phase === "result" && last ? last.after : g.stats} sc={sc} />

      {phase === "choose" && (
        <>
          {notes.map((n, k) => (
            <div key={k} className="b-note">
              <b>⏳ An earlier choice catches up with you</b>
              <p>{n.note}</p>
              <Chips e={n.effects} />
            </div>
          ))}
          <p className="eyebrow">{event ? "Surprise!" : `${stage.phase} · stage ${i + 1}`}</p>
          <h2 className="g-prompt">{stage.title}</h2>
          <p className="b-sit">{stage.situation}</p>
          <div className="g-cards">
            {order.map((k) => (
              <button key={k} className="g-card b-opt" onClick={() => pick(k)}>
                <span><b>{stage.options[k].label}</b>{stage.options[k].detail && <small>{stage.options[k].detail}</small>}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "result" && last && (
        <>
          <p className="eyebrow">{last.event ? "Surprise" : last.stage.phase} · you chose</p>
          <h2 className="g-prompt">{last.option.label}</h2>
          <p className="b-sit">{last.option.outcome}</p>
          <Chips e={last.option.effects} />
          {last.option.later?.length ? <p className="hint">⏳ This choice may have more effects later.</p> : null}
          {last.stage.months > 0 && (
            <p className="b-time">
              {last.stage.months} month{last.stage.months > 1 ? "s" : ""} later: users {fmt(last.before.users)} → <b>{fmt(last.after.users)}</b>, cash {lakh(last.before.cash)} → <b>{lakh(last.after.cash)}</b>
            </p>
          )}
          <div className="b-lesson"><b>PM lesson</b><p>{last.option.lesson}</p></div>
          <div className="g-foot">
            <button className="btn" onClick={next} autoFocus>Continue</button>
          </div>
        </>
      )}
    </div>
  );
}
