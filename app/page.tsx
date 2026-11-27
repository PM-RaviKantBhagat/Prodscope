import Link from "next/link";
import InstallApp from "@/components/InstallApp";
import TeardownForm from "@/components/TeardownForm";
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

export default function Home() {
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

      <section className="band play-band">
        <div>
          <h2>Learn product by playing it.</h2>
          <p className="lede">Run Zepto, Spotify or any of 200 products as its PM. Make the calls, lose lives on wrong ones, and win with a full picture of the product.</p>
          <div className="hub-go">
            <Link className="btn" href="/play">Start playing</Link>
            <Link className="btn ghost" href="/build">Build a startup</Link>
            <InstallApp />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="features">
          <div><h3>200 products, ready to study</h3><p>Find any of them from the search bar or the Categories menu above.</p></div>
          <div><h3>Practise like the interview</h3><p><Link href="/practice">Write your own teardown</Link> for AI feedback, or <Link href="/compare?a=zepto&b=blinkit">compare two products</Link>.</p></div>
          <div><h3>Track your prep</h3><p>Save teardowns and see <Link href="/my">your progress</Link>. No login needed.</p></div>
        </div>
      </section>
    </>
  );
}
