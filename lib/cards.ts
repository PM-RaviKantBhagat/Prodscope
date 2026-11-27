import type { Teardown } from "./schema";

export type Card = { front: string; back: string; note?: string; kind: "term" | "number" | "concept" };

/** Turns one teardown into study cards: glossary terms, key numbers and core concepts. */
export function cardsFor(company: string, r: Teardown): Card[] {
  const cards: Card[] = [];
  if (r.northStar?.metric) cards.push({ kind: "concept", front: `What is ${company}'s north star metric?`, back: r.northStar.metric, note: r.northStar.why });
  if (r.businessModel?.revenueStreams?.length)
    cards.push({ kind: "concept", front: `How does ${company} make money?`, back: r.businessModel.revenueStreams.map((s) => s.stream).join(" · "), note: r.businessModel.summary });
  if (r.businessModel?.unitEconomics) cards.push({ kind: "concept", front: `${company}: roughly what does it make on one order or customer?`, back: r.businessModel.unitEconomics });
  for (const k of r.keyNumbers ?? []) cards.push({ kind: "number", front: `${company}: ${k.label}?`, back: k.value, note: k.note });
  if (r.growth?.moat) cards.push({ kind: "concept", front: `Why is ${company} hard to copy?`, back: r.growth.moat });
  if (r.competitors?.length) cards.push({ kind: "concept", front: `Name ${company}'s main competitors.`, back: r.competitors.map((c) => c.name).join(", ") });
  for (const g of r.glossary ?? []) cards.push({ kind: "term", front: g.term, back: g.meaning, note: `From the ${company} teardown` });
  return cards;
}
