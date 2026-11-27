import Link from "next/link";
import TeardownForm from "@/components/TeardownForm";
import { getStore } from "@/lib/store";
import { FREE_PER_PERSON_PER_DAY } from "@/lib/limits";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = await getStore().listRecent(24);
  return (
    <>
      <section className="hero">
        <h1>Break down any product like a PM.</h1>
        <p>
          Enter a company and its website. You get a full teardown: what it does, who it's for, the pain points it solves, core user
          journeys, business model, competitors, north star metric and KPI tree, strengths, weaknesses and improvement ideas.
        </p>
        <TeardownForm freePerDay={FREE_PER_PERSON_PER_DAY} />
      </section>
      <section className="gallery">
        <h2>Recent teardowns</h2>
        {recent.length === 0 ? (
          <p className="hint">No teardowns yet. Be the first.</p>
        ) : (
          <div className="grid">
            {recent.map((t) => (
              <Link key={t.slug} href={`/t/${t.slug}`} className="card tile">
                <h3>{t.company}</h3>
                <p>{t.report.tagline}</p>
                <div className="meta">
                  {t.domain} · {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {t.up > 0 ? ` · 👍 ${t.up}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
