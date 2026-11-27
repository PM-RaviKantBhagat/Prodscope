"use client";

import Link from "next/link";
import type { NavGroup } from "./HeaderNav";
import { useProgress } from "./useProgress";

export default function MyProgress({ groups }: { groups: NavGroup[] }) {
  const { saved, studied, ready, toggle } = useProgress();
  if (!ready) return null;
  const all = groups.flatMap((g) => g.items.map((t) => ({ ...t, section: g.section })));
  const total = all.length;
  const done = all.filter((t) => studied.includes(t.slug)).length;
  const savedItems = all.filter((t) => saved.includes(t.slug));

  return (
    <div className="my">
      <div className="my-total card">
        <div>
          <b>{done}</b> of {total} teardowns studied
        </div>
        <div className="bar"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
        <p className="hint" style={{ margin: 0 }}>Saved in this browser only. Use the same browser to keep your progress.</p>
      </div>

      <h2>Saved for later</h2>
      {savedItems.length === 0 ? (
        <p className="hint">Nothing saved yet. Tap ☆ Save on any teardown.</p>
      ) : (
        <div className="my-saved">
          {savedItems.map((t) => (
            <div key={t.slug} className="my-row">
              <Link href={`/t/${t.slug}`}><b>{t.company}</b></Link>
              <span className="hint">{t.section}</span>
              <button className="linkish" onClick={() => toggle("saved", t.slug)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <h2>Progress by category</h2>
      <div className="my-cats">
        {groups.map((g) => {
          const n = g.items.filter((t) => studied.includes(t.slug)).length;
          return (
            <details key={g.id} className="my-cat card">
              <summary>
                <span className="my-cat-name">{g.section}</span>
                <span className="my-cat-n">{n} / {g.items.length}</span>
                <span className="bar"><i style={{ width: `${(n / g.items.length) * 100}%` }} /></span>
              </summary>
              <ul>
                {g.items.map((t) => {
                  const isDone = studied.includes(t.slug);
                  return (
                    <li key={t.slug}>
                      <button className={`tick ${isDone ? "on" : ""}`} onClick={() => toggle("studied", t.slug)} aria-label={isDone ? "Mark as not studied" : "Mark as studied"}>
                        {isDone ? "✓" : ""}
                      </button>
                      <Link href={`/t/${t.slug}`}>{t.company}</Link>
                    </li>
                  );
                })}
              </ul>
              <Link className="act" href={`/cards/category/${g.id}`}>Flashcards for this category</Link>
            </details>
          );
        })}
      </div>
    </div>
  );
}
