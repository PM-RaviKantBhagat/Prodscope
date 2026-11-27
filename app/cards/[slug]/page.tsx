import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Flashcards from "@/components/Flashcards";
import { cardsFor } from "@/lib/cards";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getStore().get((await params).slug);
  return { title: t ? `${t.company} flashcards | Prodscope` : "Flashcards | Prodscope" };
}

export default async function CardsPage({ params }: Props) {
  const t = await getStore().get((await params).slug);
  if (!t) notFound();
  const cards = cardsFor(t.company, t.report);
  return (
    <article className="page">
      <div className="eyebrow">Flashcards</div>
      <h1>{t.company}</h1>
      <p className="lede">Test yourself on the numbers, terms and ideas from the <Link href={`/t/${t.slug}`}>{t.company} teardown</Link>. Tap a card to flip it. Arrow keys work too.</p>
      <Flashcards cards={cards} deckId={t.slug} />
    </article>
  );
}
