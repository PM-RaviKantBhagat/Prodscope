"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductPicker from "./ProductPicker";
import type { NavGroup } from "./HeaderNav";
import type { PracticeFeedback } from "@/lib/ai";

const FIELDS = [
  { key: "users", label: "Who uses it, and what job do they hire it for?", ph: "e.g. Busy working people in big cities who forgot something and need it in minutes..." },
  { key: "problem", label: "What is the biggest user problem or complaint today?", ph: "e.g. Surge fees that only show up at checkout..." },
  { key: "money", label: "How does it make money? Roughly what does it keep on one order or customer?", ph: "e.g. Delivery fees, ads from brands, and a margin on products. On a ₹500 order it keeps about..." },
  { key: "northStar", label: "What north star metric would you pick, and why?", ph: "A number that shows users are getting value, not just revenue" },
  { key: "metrics", label: "Which 3 or 4 metrics drive that north star?", ph: "e.g. Weekly active buyers, orders per buyer, on-time rate..." },
  { key: "idea", label: "One improvement idea: the problem, your fix, and the metric you'd track", ph: "Keep it specific to this product" },
] as const;

type Answer = Record<(typeof FIELDS)[number]["key"], string>;
const blank = Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Answer;
const draftKey = (slug: string) => `prodscope.practice.${slug}`;

export default function PracticeForm({ groups, initial }: { groups: NavGroup[]; initial?: string }) {
  const [slug, setSlug] = useState(initial ?? "");
  const [answer, setAnswer] = useState<Answer>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const company = groups.flatMap((g) => g.items).find((t) => t.slug === slug)?.company;

  // Keep a draft per product in this browser.
  useEffect(() => {
    setFeedback(null);
    setError("");
    try {
      setAnswer({ ...blank, ...JSON.parse(localStorage.getItem(draftKey(slug)) || "{}") });
    } catch {
      setAnswer(blank);
    }
  }, [slug]);
  const update = (k: keyof Answer, v: string) => {
    const next = { ...answer, [k]: v };
    setAnswer(next);
    try {
      localStorage.setItem(draftKey(slug), JSON.stringify(next));
    } catch {}
  };

  async function submit() {
    setBusy(true);
    setError("");
    setFeedback(null);
    let apiKey = "";
    try {
      apiKey = localStorage.getItem("teardown.apiKey") || "";
    } catch {}
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, answer, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong.");
      else setFeedback(data.feedback);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const words = Object.values(answer).join(" ").split(/\s+/).filter(Boolean).length;

  return (
    <div className="practice">
      <ProductPicker
        groups={groups}
        label="Product"
        value={slug}
        onChange={(s) => {
          setSlug(s);
          history.replaceState(null, "", `/practice?p=${s}`);
        }}
      />
      {slug && (
        <>
          <p className="hint">Write your own take on {company} before you read the teardown. Short, clear answers beat long ones. Your draft is saved in this browser.</p>
          {FIELDS.map((f) => (
            <label key={f.key} className="pfield">
              <span>{f.label}</span>
              <textarea rows={3} placeholder={f.ph} value={answer[f.key]} maxLength={2000} onChange={(e) => update(f.key, e.target.value)} />
            </label>
          ))}
          <div className="prow">
            <button className="btn" disabled={busy || words < 25} onClick={submit}>
              {busy ? "Reading your answer..." : "Get feedback"}
            </button>
            <span className="hint">{words < 25 ? `Write at least 25 words (${words} so far)` : `${words} words`}</span>
          </div>
          {error && <p className="error">{error}</p>}
          {feedback && (
            <div className="pfeedback card">
              <div className="pscore"><b>{feedback.score}</b><span>/10</span></div>
              <p className="pverdict">{feedback.verdict}</p>
              <div className="two">
                <div><h3>What worked</h3><ul>{feedback.whatWorked.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                <div><h3>What to improve</h3><ul>{feedback.whatToImprove.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              </div>
              {feedback.missedIdeas.length > 0 && (<><h3>Points you missed</h3><ul>{feedback.missedIdeas.map((x, i) => <li key={i}>{x}</li>)}</ul></>)}
              <p><b>Next step:</b> {feedback.nextStep}</p>
              <p className="hint" style={{ marginBottom: 0 }}>Feedback is written by AI and can be wrong. Compare with the <Link href={`/t/${slug}`}>full {company} teardown</Link>.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
