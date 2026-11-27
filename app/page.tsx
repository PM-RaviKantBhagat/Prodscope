import Link from "next/link";
import TeardownForm from "@/components/TeardownForm";
import { getStore } from "@/lib/store";
import { FREE_PER_PERSON_PER_DAY } from "@/lib/limits";

export const dynamic = "force-dynamic";

function Preview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="pv-head">
        <div className="pv-logo">S</div>
        <div>
          <div className="pv-title">Swiggy</div>
          <div className="pv-sub">Food delivery and quick commerce</div>
        </div>
      </div>
      <div className="pv-nsm">
        <small>North star metric</small>
        <b>Weekly orders delivered on time</b>
      </div>
      <div className="pv-row">
        <div className="pv-kpi">Active users<span><i style={{ width: "78%" }} /></span></div>
        <div className="pv-kpi">Orders / user<span><i style={{ width: "54%" }} /></span></div>
        <div className="pv-kpi">On-time rate<span><i style={{ width: "88%" }} /></span></div>
      </div>
      <div className="pv-chips">
        <em>Personas</em><em>Pain points</em><em>User journeys</em><em>Business model</em><em>Competitors</em><em>Ideas</em>
      </div>
    </div>
  );
}

export default async function Home() {
  const recent = await getStore().listRecent(24);
  return (
    <>
      <section className="hero" id="start">
        <div>
          <h1>Tear down any product like a PM.</h1>
          <p className="lede">
            Enter a company and its website. Get personas, pain points, user journeys, business model, competitors, a north star
            metric with its KPI tree, and ideas to make it better.
          </p>
          <TeardownForm freePerDay={FREE_PER_PERSON_PER_DAY} />
        </div>
        <Preview />
      </section>

      <section className="band">
        <h2>Built for APM prep</h2>
        <div className="features">
          <div><div className="ico">1</div><h3>Reads the real product</h3><p>Pulls the company&apos;s own site, pricing and about pages, then researches competitors and reviews on the web.</p></div>
          <div><div className="ico">2</div><h3>Thinks in PM frameworks</h3><p>North star, KPI tree, guardrails, journeys and prioritised ideas, laid out the way interviewers expect.</p></div>
          <div><div className="ico">3</div><h3>Share with your cohort</h3><p>Every teardown gets a link. Read what others generated, vote and leave feedback.</p></div>
        </div>
      </section>

      <section className="band" id="recent">
        <h2>Recent teardowns</h2>
        {recent.length === 0 ? (
          <p className="hint">No teardowns yet. Be the first.</p>
        ) : (
          <div className="grid">
            {recent.map((t) => (
              <Link key={t.slug} href={`/t/${t.slug}`} className="card tile">
                <span className="go">→</span>
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
