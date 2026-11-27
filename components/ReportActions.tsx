"use client";

import Link from "next/link";
import { useProgress } from "./useProgress";

/** Save / studied buttons and links to compare, flashcards and practice, shown on each report. */
export default function ReportActions({ slug }: { slug: string }) {
  const { saved, studied, toggle } = useProgress();
  const isSaved = saved.includes(slug);
  const isStudied = studied.includes(slug);
  return (
    <div className="actions">
      <button className={`act ${isSaved ? "on" : ""}`} onClick={() => toggle("saved", slug)} aria-pressed={isSaved}>
        {isSaved ? "★ Saved" : "☆ Save"}
      </button>
      <button className={`act ${isStudied ? "on" : ""}`} onClick={() => toggle("studied", slug)} aria-pressed={isStudied}>
        {isStudied ? "✓ Studied" : "Mark as studied"}
      </button>
      <Link className="act" href={`/cards/${slug}`}>Flashcards</Link>
      <Link className="act" href={`/compare?a=${slug}`}>Compare</Link>
      <Link className="act" href={`/practice?p=${slug}`}>Write your own</Link>
    </div>
  );
}
