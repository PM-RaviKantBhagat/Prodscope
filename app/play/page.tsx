import type { Metadata } from "next";
import PlayHub from "@/components/PlayHub";
import { gameList } from "@/lib/learn/games";
import { SECTION_ORDER } from "@/lib/sections";

export const metadata: Metadata = { title: "Play | Prodscope" };

export default function PlayPage() {
  const list = gameList();
  const sections = SECTION_ORDER.map((section) => ({ section, items: list.filter((g) => g.section === section).map(({ slug, company }) => ({ slug, company })) })).filter(
    (s) => s.items.length > 0,
  );
  return (
    <article className="page">
      <div className="eyebrow">Play</div>
      <h1>Learn product by playing it.</h1>
      <p className="lede">Pick a product and run it as its PM. Make the calls on users, money, metrics and growth. Wrong calls cost a life. Win, and you understand the whole product.</p>
      <PlayHub sections={sections} />
    </article>
  );
}
