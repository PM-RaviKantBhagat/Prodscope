import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductGame from "@/components/ProductGame";
import { gameList, getGame } from "@/lib/learn/games";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGame((await params).slug);
  return { title: g ? `Play ${g.company} | Prodscope` : "Play | Prodscope" };
}

const randomSlug = (not?: string) => {
  const list = gameList().filter((g) => g.slug !== not);
  return list[Math.floor(Math.random() * list.length)].slug;
};

export default async function PlayGame({ params }: Props) {
  const { slug } = await params;
  if (slug === "random") redirect(`/play/${randomSlug()}`);
  const game = getGame(slug);
  if (!game) notFound();
  return (
    <article className="page narrow">
      <ProductGame key={game.slug} game={game} next={randomSlug(game.slug)} />
    </article>
  );
}
