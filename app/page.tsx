import TeardownForm from "@/components/TeardownForm";
import { getStore } from "@/lib/store";
import { FREE_PER_PERSON_PER_DAY } from "@/lib/limits";
import Gallery, { type GalleryGroup } from "@/components/Gallery";
import { COMMUNITY_SECTION, SECTION_ORDER, SEED, sectionSlug } from "@/lib/sections";

const seedRank = new Map(SEED.map((p) => [p.domain, p.rank]));

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
  const items = await getStore().listGallery();
  const order = [...SECTION_ORDER, COMMUNITY_SECTION];
  const groups: GalleryGroup[] = order
    .map((section) => ({
      section,
      id: sectionSlug(section),
      items: items
        .filter((t) => (order.includes(t.section) ? t.section : COMMUNITY_SECTION) === section)
        .sort((a, b) => (seedRank.get(a.domain) ?? 999) - (seedRank.get(b.domain) ?? 999) || b.createdAt.localeCompare(a.createdAt))
        .map((t) => ({ slug: t.slug, company: t.company, tagline: t.tagline, category: t.category, curated: t.origin === "curated", up: t.up })),
    }))
    .filter((g) => g.items.length > 0);
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
          <div><div className="ico">1</div><h3>200 products, ready to study</h3><p>The top products APM interviewers ask about, researched and written in plain words, grouped by category.</p></div>
          <div><div className="ico">2</div><h3>Thinks in PM frameworks</h3><p>North star, KPI tree, money per order, journeys, user complaints and prioritised ideas, laid out the way interviewers expect.</p></div>
          <div><div className="ico">3</div><h3>Any other product, on demand</h3><p>Not in the library? Enter its website and get a fresh AI teardown in a couple of minutes. Share it with your cohort.</p></div>
        </div>
      </section>

      <section className="band" id="recent">
        <h2>Teardown library</h2>
        {groups.length === 0 ? <p className="hint">No teardowns yet. Be the first.</p> : <Gallery groups={groups} />}
      </section>
    </>
  );
}
