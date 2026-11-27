"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type GalleryGroup = {
  section: string;
  id: string;
  items: { slug: string; company: string; tagline: string; category: string; curated: boolean; up: number }[];
};

export default function Gallery({ groups }: { groups: GalleryGroup[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();

  const visible = useMemo(
    () =>
      groups
        .filter((g) => !only || g.id === only)
        .map((g) => ({
          ...g,
          items: needle
            ? g.items.filter((t) => `${t.company} ${t.category} ${t.tagline}`.toLowerCase().includes(needle))
            : g.items,
        }))
        .filter((g) => g.items.length > 0),
    [groups, only, needle],
  );
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="gallery">
      <input
        className="gallery-search"
        type="search"
        placeholder={`Search ${total} teardowns, e.g. Zepto or payments`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search teardowns"
      />
      <div className="cat-chips">
        <button className={!only ? "on" : ""} onClick={() => setOnly(null)}>All</button>
        {groups.map((g) => (
          <button key={g.id} className={only === g.id ? "on" : ""} onClick={() => setOnly(only === g.id ? null : g.id)}>
            {g.section} <span>{g.items.length}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="hint">No teardown matches that yet. Generate one above.</p>}
      {visible.map((g) => (
        <div key={g.id} id={g.id} className="cat">
          <h3 className="cat-title">{g.section} <span>{g.items.length}</span></h3>
          <div className="grid">
            {g.items.map((t) => (
              <Link key={t.slug} href={`/t/${t.slug}`} className="card tile">
                <span className="go">→</span>
                <h3>{t.company}</h3>
                <p>{t.tagline}</p>
                <div className="meta">
                  {t.category}
                  {t.curated ? " · Curated" : " · AI"}
                  {t.up > 0 ? ` · 👍 ${t.up}` : ""}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
