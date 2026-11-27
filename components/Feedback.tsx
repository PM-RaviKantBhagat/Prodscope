"use client";

import { useState } from "react";

export default function Feedback({ slug }: { slug: string }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  async function send(v: "up" | "down" | null, c: string) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, vote: v, comment: c }),
    }).catch(() => {});
  }

  return (
    <div className="card feedback">
      <div className="row">
        <span>Was this teardown useful?</span>
        {(["up", "down"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`ghost ${vote === v ? "active" : ""}`}
            disabled={vote !== null}
            onClick={() => {
              setVote(v);
              send(v, "");
            }}
          >
            {v === "up" ? "👍 Yes" : "👎 Not really"}
          </button>
        ))}
      </div>
      {sent ? (
        <p className="hint" style={{ margin: 0 }}>Thanks for the feedback!</p>
      ) : (
        <>
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What was missing or wrong? What would make this more useful?" />
          <div className="row">
            <button type="button" disabled={!comment.trim()} onClick={() => { send(null, comment); setSent(true); }}>
              Send feedback
            </button>
          </div>
        </>
      )}
      <div className="row">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true)).catch(() => {});
          }}
        >
          {copied ? "Link copied" : "Copy link to share"}
        </button>
        <button type="button" className="ghost" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>
    </div>
  );
}
