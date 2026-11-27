"use client";

import Link from "next/link";
import { LearnStats } from "./PlayHub";
import { useLearn } from "./useLearn";

type U = { id: string; title: string; summary: string; icon: string; lessons: { id: string; title: string }[] };

export default function LearnPath({ units }: { units: U[] }) {
  const s = useLearn();
  const all = units.flatMap((u) => u.lessons.map((l) => l.id));
  // The first lesson not yet done is the one to do now; everything after it is locked.
  const nextUp = all.find((id) => !(s.ready && s.lessons[id])) ?? null;
  const open = (id: string) => (s.ready && s.lessons[id]) || id === nextUp;

  return (
    <div className="hub">
      <LearnStats />
      <div className="hub-go">
        {nextUp && <Link className="btn" href={`/learn/${nextUp}`}>{s.ready && Object.keys(s.lessons).length ? "Continue" : "Start lesson 1"}</Link>}
        <Link className="btn ghost" href="/play">Play a product</Link>
      </div>
      <ol className="path">
        {units.map((u, ui) => {
          const done = u.lessons.filter((l) => s.ready && s.lessons[l.id]).length;
          return (
            <li key={u.id} className={`unit ${u.lessons.some((l) => open(l.id)) ? "" : "locked"}`}>
              <div className="unit-head">
                <span className="unit-ico">{u.icon}</span>
                <div>
                  <small>Unit {ui + 1} · {done}/{u.lessons.length}</small>
                  <h3>{u.title}</h3>
                  <p>{u.summary}</p>
                </div>
              </div>
              <div className="nodes">
                {u.lessons.map((l, i) => {
                  const stars = s.ready ? s.lessons[l.id] : undefined;
                  const cls = stars ? "done" : l.id === nextUp ? "now" : "lock";
                  const inner = (
                    <>
                      <span className="lnode-dot">{stars ? "✓" : l.id === nextUp ? "▶" : "🔒"}</span>
                      <span className="lnode-t">{l.title}{stars ? <em>{"★".repeat(stars)}</em> : null}</span>
                    </>
                  );
                  return open(l.id) ? (
                    <Link key={l.id} href={`/learn/${l.id}`} className={`lnode ${cls}`} style={{ marginLeft: `${[0, 28, 56, 28][i % 4]}px` }}>{inner}</Link>
                  ) : (
                    <div key={l.id} className={`lnode ${cls}`} style={{ marginLeft: `${[0, 28, 56, 28][i % 4]}px` }}>{inner}</div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
