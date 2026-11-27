import type { Metadata } from "next";
import BuildList from "@/components/BuildList";
import { SCENARIOS } from "@/lib/sim/scenarios";

export const metadata: Metadata = { title: "Build a product | Prodscope" };

export default function BuildIndex() {
  const list = SCENARIOS.map(({ id, title, icon, tagline, stages }) => ({ id, title, icon, tagline, stages: stages.length }));
  return (
    <article className="page">
      <div className="eyebrow">Build a product</div>
      <h1>Run a startup from idea to profit.</h1>
      <p className="lede">You are the founding PM. Watch your cash, users, trust and team. Every call has a cost, some show up months later, and surprises hit when you least expect them. It is hard on purpose.</p>
      <BuildList list={list} />
    </article>
  );
}
