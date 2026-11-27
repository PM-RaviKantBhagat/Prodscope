import type { Metadata } from "next";
import Link from "next/link";
import ComparePicker from "@/components/ComparePicker";
import { getNavGroups } from "@/lib/navGroups";
import { getStore } from "@/lib/store";
import type { StoredTeardown } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare products | Prodscope" };

type Props = { searchParams: Promise<{ a?: string; b?: string }> };

const list = (x?: string[]) => (x?.length ? <ul>{x.map((v, i) => <li key={i}>{v}</li>)}</ul> : <span className="hint">Not covered</span>);

const ROWS: { label: string; render: (t: StoredTeardown) => React.ReactNode }[] = [
  { label: "In simple words", render: (t) => t.report.simpleSummary || t.report.tagline },
  { label: "Category", render: (t) => t.report.category },
  {
    label: "Key numbers",
    render: (t) => list(t.report.keyNumbers?.map((k) => `${k.label}: ${k.value}`)),
  },
  { label: "Who uses it", render: (t) => list(t.report.personas.map((p) => p.name)) },
  { label: "Top pain points solved", render: (t) => list(t.report.painPoints.filter((p) => p.severity === "high").map((p) => p.pain).slice(0, 4)) },
  { label: "How it makes money", render: (t) => list(t.report.businessModel.revenueStreams.map((s) => s.stream)) },
  { label: "Pricing", render: (t) => t.report.businessModel.pricing },
  { label: "Money on one order or customer", render: (t) => t.report.businessModel.unitEconomics ?? <span className="hint">Not covered</span> },
  { label: "Biggest costs", render: (t) => list(t.report.businessModel.costDrivers.slice(0, 4)) },
  { label: "North star metric", render: (t) => <b>{t.report.northStar.metric}</b> },
  { label: "KPI drivers", render: (t) => list(t.report.kpiTree.map((b) => b.metric)) },
  { label: "How it gets users", render: (t) => list(t.report.growth?.howTheyGetUsers) },
  { label: "What brings users back", render: (t) => list(t.report.growth?.whatBringsUsersBack) },
  { label: "Why it is hard to copy", render: (t) => t.report.growth?.moat ?? <span className="hint">Not covered</span> },
  { label: "Main competitors", render: (t) => t.report.competitors.map((c) => c.name).join(", ") },
  { label: "Strengths", render: (t) => list(t.report.strengths.slice(0, 4)) },
  { label: "Weaknesses", render: (t) => list(t.report.weaknesses.slice(0, 4)) },
  { label: "What users complain about", render: (t) => list(t.report.userComplaints?.slice(0, 4)) },
  { label: "Risks", render: (t) => list(t.report.risks?.slice(0, 4)) },
];

export default async function ComparePage({ searchParams }: Props) {
  const { a, b } = await searchParams;
  const store = getStore();
  const [groups, ta, tb] = await Promise.all([getNavGroups(), a ? store.get(a) : null, b ? store.get(b) : null]);
  const both = [ta, tb].filter(Boolean) as StoredTeardown[];
  return (
    <article className="page wide">
      <div className="eyebrow">Compare</div>
      <h1>Compare two products</h1>
      <p className="lede">Pick two products to see their users, money, metrics and weak spots side by side. A classic interview move: &ldquo;How is Zepto different from Blinkit?&rdquo;</p>
      <ComparePicker groups={groups} a={ta?.slug} b={tb?.slug} />
      {both.length === 2 ? (
        <div className="table-wrap compare">
          <table>
            <thead>
              <tr>
                <th></th>
                {both.map((t) => (
                  <th key={t.slug}><Link href={`/t/${t.slug}`}>{t.company}</Link></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {both.map((t) => <td key={t.slug}>{row.render(t)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint" style={{ marginTop: 24 }}>Choose {both.length === 1 ? "one more product" : "two products"} to compare.</p>
      )}
    </article>
  );
}
