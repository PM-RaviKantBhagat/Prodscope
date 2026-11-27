"use client";

import Link from "next/link";
import { useLearn } from "./useLearn";

type Item = { id: string; title: string; icon: string; tagline: string; stages: number };

export default function BuildList({ list }: { list: Item[] }) {
  const { games, ready } = useLearn();
  return (
    <div className="grid">
      {list.map((s) => {
        const stars = ready ? games[`build:${s.id}`] : undefined;
        return (
          <Link key={s.id} href={`/build/${s.id}`} className="card tile">
            <h3>{s.icon} {s.title}</h3>
            <p>{s.tagline}</p>
            <div className="meta">
              {s.stages} big decisions plus surprises
              <span className="go">{stars ? "★".repeat(stars) : stars === 0 ? "Try again →" : "Play →"}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
