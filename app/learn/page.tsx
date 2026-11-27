import type { Metadata } from "next";
import LearnPath from "@/components/LearnPath";
import { pathData } from "@/lib/learn/units";

export const metadata: Metadata = { title: "Skill lessons | Prodscope" };

export default function LearnPage() {
  return (
    <article className="page">
      <div className="eyebrow">Skill lessons</div>
      <h1>Think like a PM, a few minutes a day.</h1>
      <p className="lede">Short lessons on users, money, metrics, KPI trees, product sense and more, with real products as examples. Finish a lesson to unlock the next.</p>
      <LearnPath units={pathData()} />
    </article>
  );
}
