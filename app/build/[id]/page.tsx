import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuildGame from "@/components/BuildGame";
import { SCENARIOS, getScenario } from "@/lib/sim/scenarios";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => SCENARIOS.map((s) => ({ id: s.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sc = getScenario((await params).id);
  return { title: sc ? `Build ${sc.title} | Prodscope` : "Build a product | Prodscope" };
}

export default async function BuildPage({ params }: Props) {
  const sc = getScenario((await params).id);
  if (!sc) notFound();
  return (
    <article className="page narrow">
      <BuildGame key={sc.id} sc={sc} />
    </article>
  );
}
