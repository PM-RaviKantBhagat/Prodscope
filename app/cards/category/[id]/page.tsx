import Link from "next/link";
import { notFound } from "next/navigation";
import Flashcards from "@/components/Flashcards";
import { cardsFor, type Card } from "@/lib/cards";
import { getGroups } from "@/lib/gallery";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export default async function CategoryCards({ params }: Props) {
  const { id } = await params;
  const g = (await getGroups()).find((x) => x.id === id);
  if (!g) notFound();
  const store = getStore();
  const full = await Promise.all(g.items.map((t) => store.get(t.slug)));
  // Per product: its north star, business model and key numbers. Glossary terms are shared, so keep one card per term.
  const cards: Card[] = [];
  const seen = new Set<string>();
  for (const t of full) {
    if (!t) continue;
    for (const c of cardsFor(t.company, t.report)) {
      const k = c.kind === "term" ? c.front.toLowerCase() : c.front;
      if (seen.has(k)) continue;
      seen.add(k);
      cards.push(c);
    }
  }
  return (
    <article className="page">
      <div className="eyebrow">Flashcards · category</div>
      <h1>{g.section}</h1>
      <p className="lede">{cards.length} cards from {g.items.length} teardowns. <Link href={`/#${g.id}`}>See the teardowns</Link>.</p>
      <Flashcards cards={cards} deckId={`cat:${g.id}`} />
    </article>
  );
}
