import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Feedback from "@/components/Feedback";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getStore().get((await params).slug);
  if (!t) return { title: "Teardown not found" };
  return { title: `${t.company} product teardown | Prodscope`, description: t.report.tagline };
}

const SECTIONS = [
  ["overview", "Overview"],
  ["personas", "Personas"],
  ["pain-points", "Pain points"],
  ["journeys", "User journeys"],
  ["business", "Business model"],
  ["competitors", "Competitors"],
  ["metrics", "North star & KPIs"],
  ["swot", "Strengths & weaknesses"],
  ["ideas", "Improvement ideas"],
  ["interview", "Interview prep"],
] as const;

function H({ id, children }: { id: (typeof SECTIONS)[number][0]; children: React.ReactNode }) {
  const n = SECTIONS.findIndex((s) => s[0] === id) + 1;
  return (
    <h2>
      <span className="num">{String(n).padStart(2, "0")}</span>
      {children}
    </h2>
  );
}

export default async function TeardownPage({ params }: Props) {
  const t = await getStore().get((await params).slug);
  if (!t) notFound();
  const r = t.report;

  return (
    <article>
      <header className="report-head">
        <div className="eyebrow">Product teardown</div>
        <h1>{r.company}</h1>
        <p className="tagline">{r.tagline}</p>
        <div className="chips">
          <span className="chip">{r.category}</span>
          <a className="chip plain" href={t.url} target="_blank" rel="noreferrer">{t.domain}</a>
          <span className="chip plain">Generated {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </header>

      <nav className="toc">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>

      <section id="overview" className="section">
        <H id="overview">What the product does</H>
        <div className="card">
          <p style={{ marginTop: 0 }}>{r.overview.whatItDoes}</p>
          <div className="label">How it works</div>
          <ul>{r.overview.howItWorks.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <div className="label">Value proposition</div>
          <p style={{ marginBottom: 0 }}>{r.overview.valueProposition}</p>
        </div>
      </section>

      <section id="personas" className="section">
        <H id="personas">Target users and personas</H>
        <div className="two">
          {r.personas.map((p, i) => (
            <div key={i} className="card">
              <h3>{p.name}</h3>
              <p style={{ margin: 0 }}>{p.description}</p>
              <div className="label">Goals</div>
              <ul>{p.goals.map((g, j) => <li key={j}>{g}</li>)}</ul>
              <div className="label">Frustrations</div>
              <ul>{p.frustrations.map((g, j) => <li key={j}>{g}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="pain-points" className="section">
        <H id="pain-points">Pain points solved</H>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Pain point</th><th>How the product solves it</th><th>Severity</th></tr></thead>
            <tbody>
              {r.painPoints.map((p, i) => (
                <tr key={i}><td>{p.pain}</td><td>{p.howSolved}</td><td><span className={`pill ${p.severity}`}>{p.severity}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="journeys" className="section">
        <H id="journeys">Core user journeys</H>
        <div className="two">
          {r.userJourneys.map((j, i) => (
            <div key={i} className="card">
              <h3>{j.name}</h3>
              <span className="hint">Persona: {j.persona}</span>
              <ol className="journey">
                {j.steps.map((s, k) => (
                  <li key={k}><div><b>{s.step}</b><br /><span className="hint">{s.detail}</span></div></li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section id="business" className="section">
        <H id="business">Business model</H>
        <div className="card">
          <p style={{ marginTop: 0 }}>{r.businessModel.summary}</p>
          <div className="label">Revenue streams</div>
          <ul>{r.businessModel.revenueStreams.map((s, i) => <li key={i}><b>{s.stream}:</b> {s.detail}</li>)}</ul>
          <div className="label">Pricing</div>
          <p style={{ margin: "4px 0" }}>{r.businessModel.pricing}</p>
          <div className="label">Main cost drivers</div>
          <ul>{r.businessModel.costDrivers.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      </section>

      <section id="competitors" className="section">
        <H id="competitors">Competitive landscape</H>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Competitor</th><th>Positioning</th><th>How {r.company} differs</th></tr></thead>
            <tbody>
              {r.competitors.map((c, i) => (
                <tr key={i}><td><b>{c.name}</b></td><td>{c.positioning}</td><td>{c.howThisProductDiffers}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="metrics" className="section">
        <H id="metrics">North star metric and KPI tree</H>
        <div className="nsm">
          <div className="k">North star metric</div>
          <div className="m">{r.northStar.metric}</div>
          <div>{r.northStar.why}</div>
        </div>
        <div className="tree">
          {r.kpiTree.map((b, i) => (
            <div key={i} className="branch">
              <div className="node"><b>{b.metric}</b><span>{b.description}</span></div>
              <div className="leaves">
                {b.children.map((c, j) => (
                  <div key={j} className="node"><b>{c.metric}</b><span>{c.description}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {r.guardrailMetrics.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Guardrail metrics</h3>
            <ul>{r.guardrailMetrics.map((g, i) => <li key={i}>{g}</li>)}</ul>
          </div>
        )}
      </section>

      <section id="swot" className="section">
        <H id="swot">Strengths and weaknesses</H>
        <div className="sw">
          <div className="card s"><h3>Strengths</h3><ul>{r.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          <div className="card w"><h3>Weaknesses</h3><ul>{r.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
      </section>

      <section id="ideas" className="section">
        <H id="ideas">Improvement ideas</H>
        <div className="two">
          {r.improvementIdeas.map((x, i) => (
            <div key={i} className="card">
              <h3>{x.idea}</h3>
              <span className={`pill ${x.effort === "low" ? "low" : x.effort === "high" ? "high" : "medium"}`}>{x.effort} effort</span>
              <div className="label">Problem</div><p style={{ margin: "2px 0" }}>{x.problem}</p>
              <div className="label">Expected impact</div><p style={{ margin: "2px 0" }}>{x.expectedImpact}</p>
              <div className="label">Metric to track</div><p style={{ margin: "2px 0" }}>{x.metricToTrack}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="interview" className="section">
        <H id="interview">Interview prep questions</H>
        {r.interviewQuestions.map((q, i) => (
          <details key={i}>
            <summary>{q.question}</summary>
            <p style={{ marginBottom: 0 }}>{q.hint}</p>
          </details>
        ))}
      </section>

      <section className="section">
        <h2>Assumptions and sources</h2>
        <div className="card">
          <div className="label" style={{ marginTop: 0 }}>Assumptions to sanity-check</div>
          <ul>{r.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          {t.sources.length > 0 && (
            <>
              <div className="label">Sources</div>
              <ul className="sources">{t.sources.map((s) => <li key={s}><a href={s} target="_blank" rel="noreferrer">{s}</a></li>)}</ul>
            </>
          )}
        </div>
      </section>

      <section className="section feedback-section">
        <h2>Feedback</h2>
        <Feedback slug={t.slug} />
      </section>
    </article>
  );
}
