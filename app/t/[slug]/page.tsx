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
  ["simple", "In simple words"],
  ["overview", "Overview"],
  ["personas", "Personas"],
  ["pain-points", "Pain points"],
  ["journeys", "User journeys"],
  ["business", "Business model"],
  ["growth", "Growth"],
  ["competitors", "Competitors"],
  ["metrics", "North star & KPIs"],
  ["swot", "Strengths & risks"],
  ["ideas", "Improvement ideas"],
  ["lessons", "PM lessons"],
  ["interview", "Interview prep"],
  ["glossary", "Glossary"],
] as const;

const list = <T,>(x: T[] | undefined): T[] => x ?? [];

type Id = (typeof SECTIONS)[number][0];
function H({ id, shown, children }: { id: Id; shown: readonly (readonly [Id, string])[]; children: React.ReactNode }) {
  const n = shown.findIndex((s) => s[0] === id) + 1;
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
  // Older live reports were made before some sections existed, so hide sections that are empty.
  const shown = SECTIONS.filter(([id]) => {
    if (id === "simple") return !!r.simpleSummary || list(r.keyNumbers).length > 0;
    if (id === "growth") return !!r.growth;
    if (id === "lessons") return list(r.pmLessons).length > 0;
    if (id === "glossary") return list(r.glossary).length > 0;
    return true;
  });

  return (
    <article>
      <header className="report-head">
        <div className="eyebrow">{t.origin === "curated" ? "Curated teardown" : "AI teardown"}{t.section ? ` · ${t.section}` : ""}</div>
        <h1>{r.company}</h1>
        <p className="tagline">{r.tagline}</p>
        <div className="chips">
          <span className="chip">{r.category}</span>
          <a className="chip plain" href={t.url} target="_blank" rel="noreferrer">{t.domain}</a>
          <span className="chip plain">{t.origin === "curated" ? "Researched" : "Generated"} {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </header>

      <nav className="toc">
        {shown.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>

      {shown.some((x) => x[0] === "simple") && (
        <section id="simple" className="section">
          <H shown={shown} id="simple">In simple words</H>
          {r.simpleSummary && <p className="simple">{r.simpleSummary}</p>}
          {list(r.keyNumbers).length > 0 && (
            <div className="numbers">
              {list(r.keyNumbers).map((k, i) => (
                <div key={i} className="number">
                  <div className="v">{k.value}</div>
                  <div className="l">{k.label}</div>
                  <div className="n">{k.note}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section id="overview" className="section">
        <H shown={shown} id="overview">What the product does</H>
        <div className="card">
          <p style={{ marginTop: 0 }}>{r.overview.whatItDoes}</p>
          <div className="label">How it works</div>
          <ul>{r.overview.howItWorks.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <div className="label">Value proposition</div>
          <p style={{ marginBottom: 0 }}>{r.overview.valueProposition}</p>
        </div>
        {list(r.coreFeatures).length > 0 && (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Feature</th><th>What it does</th><th>Why it matters</th></tr></thead>
              <tbody>
                {list(r.coreFeatures).map((f, i) => (
                  <tr key={i}><td><b>{f.feature}</b></td><td>{f.whatItDoes}</td><td>{f.whyItMatters}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="personas" className="section">
        <H shown={shown} id="personas">Target users and personas</H>
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
        <H shown={shown} id="pain-points">Pain points solved</H>
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
        <H shown={shown} id="journeys">Core user journeys</H>
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
        <H shown={shown} id="business">Business model</H>
        <div className="card">
          <p style={{ marginTop: 0 }}>{r.businessModel.summary}</p>
          <div className="label">Revenue streams</div>
          <ul>{r.businessModel.revenueStreams.map((s, i) => <li key={i}><b>{s.stream}:</b> {s.detail}</li>)}</ul>
          <div className="label">Pricing</div>
          <p style={{ margin: "4px 0" }}>{r.businessModel.pricing}</p>
          <div className="label">Main cost drivers</div>
          <ul>{r.businessModel.costDrivers.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
        {r.businessModel.unitEconomics && (
          <div className="nsm" style={{ marginTop: 12 }}>
            <div className="k">Money on one order or customer</div>
            <div>{r.businessModel.unitEconomics}</div>
          </div>
        )}
      </section>

      {r.growth && (
        <section id="growth" className="section">
          <H shown={shown} id="growth">How it grows</H>
          <div className="two">
            <div className="card"><h3>How they get users</h3><ul>{list(r.growth.howTheyGetUsers).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div className="card"><h3>What brings users back</h3><ul>{list(r.growth.whatBringsUsersBack).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          </div>
          <div className="card" style={{ marginTop: 12 }}><h3>Why it is hard to copy</h3><p style={{ margin: 0 }}>{r.growth.moat}</p></div>
        </section>
      )}

      <section id="competitors" className="section">
        <H shown={shown} id="competitors">Competitive landscape</H>
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
        <H shown={shown} id="metrics">North star metric and KPI tree</H>
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
        <H shown={shown} id="swot">Strengths, weaknesses and risks</H>
        <div className="sw">
          <div className="card s"><h3>Strengths</h3><ul>{r.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          <div className="card w"><h3>Weaknesses</h3><ul>{r.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
        {(list(r.risks).length > 0 || list(r.userComplaints).length > 0) && (
          <div className="sw" style={{ marginTop: 12 }}>
            {list(r.userComplaints).length > 0 && <div className="card"><h3>What users complain about</h3><ul>{list(r.userComplaints).map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            {list(r.risks).length > 0 && <div className="card"><h3>Risks from outside</h3><ul>{list(r.risks).map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          </div>
        )}
      </section>

      <section id="ideas" className="section">
        <H shown={shown} id="ideas">Improvement ideas</H>
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

      {list(r.pmLessons).length > 0 && (
        <section id="lessons" className="section">
          <H shown={shown} id="lessons">What a PM can learn from {r.company}</H>
          <ol className="lessons">{list(r.pmLessons).map((x, i) => <li key={i}>{x}</li>)}</ol>
        </section>
      )}

      <section id="interview" className="section">
        <H shown={shown} id="interview">Interview prep questions</H>
        {r.interviewQuestions.map((q, i) => (
          <details key={i}>
            <summary>{q.question}</summary>
            <p style={{ marginBottom: 0 }}>{q.hint}</p>
          </details>
        ))}
      </section>

      {list(r.glossary).length > 0 && (
        <section id="glossary" className="section">
          <H shown={shown} id="glossary">Glossary</H>
          <dl className="glossary">
            {list(r.glossary).map((g, i) => (
              <div key={i}><dt>{g.term}</dt><dd>{g.meaning}</dd></div>
            ))}
          </dl>
        </section>
      )}

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
