"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import InstallApp from "./InstallApp";
import { DAILY_GOAL, XP_PER_LEVEL, badgesOf, useLearn } from "./useLearn";

type Section = { section: string; items: { slug: string; company: string }[] };

export function LearnStats() {
  const s = useLearn();
  const goal = Math.min(100, (s.todayXp / DAILY_GOAL) * 100);
  return (
    <div className="l-stats">
      <div><span className="l-big">🔥 {s.ready ? s.streak : 0}</span><small>day streak</small></div>
      <div><span className="l-big">⚡ {s.ready ? s.xp : 0}</span><small>total XP</small></div>
      <div className="l-meter">
        <small>Level {s.ready ? s.level : 1}</small>
        <span><i style={{ width: `${s.ready ? (s.levelXp / XP_PER_LEVEL) * 100 : 0}%` }} /></span>
        <small>{s.ready ? XP_PER_LEVEL - s.levelXp : XP_PER_LEVEL} XP to next level</small>
      </div>
      <div className="l-meter">
        <small>Daily goal</small>
        <span className={goal >= 100 ? "done" : ""}><i style={{ width: `${s.ready ? goal : 0}%` }} /></span>
        <small>{s.ready ? Math.min(s.todayXp, DAILY_GOAL) : 0} / {DAILY_GOAL} XP today{goal >= 100 ? " ✓" : ""}</small>
      </div>
    </div>
  );
}

export default function PlayHub({ sections }: { sections: Section[] }) {
  const s = useLearn();
  const [open, setOpen] = useState(sections[0]?.section ?? "");
  const bySection = useMemo(() => Object.fromEntries(sections.map((x) => [x.section, x.items.map((i) => i.slug)])), [sections]);
  const badges = badgesOf(s, bySection);
  const total = sections.reduce((n, x) => n + x.items.length, 0);
  const won = Object.values(s.games).filter((v) => v > 0).length;
  const cur = sections.find((x) => x.section === open);

  return (
    <div className="hub">
      <LearnStats />
      <div className="hub-go">
        <Link className="btn" href="/play/random">Play a random product</Link>
        <Link className="btn ghost" href="/learn">Skill lessons</Link>
        <InstallApp />
        <span className="hint">{s.ready ? won : 0} of {total} products won</span>
      </div>

      <h2 className="hub-h">Pick a category</h2>
      <div className="cat-chips">
        {sections.map((x) => {
          const n = s.ready ? x.items.filter((i) => (s.games[i.slug] ?? 0) > 0).length : 0;
          return (
            <button key={x.section} className={open === x.section ? "on" : ""} onClick={() => setOpen(x.section)}>
              {x.section} <span>{n}/{x.items.length}</span>
            </button>
          );
        })}
      </div>
      {cur && (
        <div className="hub-games">
          {cur.items.map((i) => {
            const stars = s.ready ? s.games[i.slug] : undefined;
            return (
              <Link key={i.slug} href={`/play/${i.slug}`} className={`hub-game ${stars ? "won" : stars === 0 ? "tried" : ""}`}>
                <b>{i.company}</b>
                <span>{stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : stars === 0 ? "Try again" : "Play"}</span>
              </Link>
            );
          })}
        </div>
      )}

      <h2 className="hub-h">Badges</h2>
      <div className="badges">
        {badges.map((b) => (
          <div key={b.id} className={`badge ${s.ready && b.got ? "got" : ""}`} title={b.how}>
            <span>{b.icon}</span>
            <b>{b.name}</b>
            <small>{b.how}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
