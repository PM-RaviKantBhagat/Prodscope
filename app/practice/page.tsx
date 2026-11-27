import type { Metadata } from "next";
import PracticeForm from "@/components/PracticeForm";
import { getNavGroups } from "@/lib/navGroups";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Write your own teardown | Prodscope" };

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const groups = await getNavGroups();
  const valid = groups.some((g) => g.items.some((t) => t.slug === p));
  return (
    <article className="page">
      <div className="eyebrow">Practice</div>
      <h1>Write your own teardown</h1>
      <p className="lede">Pick a product, answer six short questions like you would in an interview, and get honest feedback from AI, checked against our researched teardown.</p>
      <PracticeForm groups={groups} initial={valid ? p : undefined} />
    </article>
  );
}
