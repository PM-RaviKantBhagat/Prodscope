"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const KEY_STORAGE = "teardown.apiKey";

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export default function TeardownForm({ freePerDay }: { freePerDay: number }) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (!company.trim() || !url.trim()) return;
    const key = apiKey.trim() || readKey();
    setBusy(true);
    setError(null);
    setSteps(["Starting"]);
    try {
      const res = await fetch("/api/teardown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company, url, apiKey: key || undefined }),
      });
      if (!res.body) throw new Error("No response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "status") setSteps((s) => [...s, ev.message]);
          if (ev.type === "done") {
            if (key && remember) {
              try {
                localStorage.setItem(KEY_STORAGE, key);
              } catch {}
            }
            router.push(`/t/${ev.slug}`);
            return;
          }
          if (ev.type === "error") {
            setError(ev.message);
            if (ev.code === "quota" || ev.code === "bad_key") setNeedKey(true);
            if (ev.code === "bad_key") {
              try {
                localStorage.removeItem(KEY_STORAGE);
              } catch {}
            }
            setBusy(false);
            return;
          }
        }
      }
      setError("The connection closed early. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <form className="form" onSubmit={run}>
        <label>
          Company name
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Swiggy" required disabled={busy} />
        </label>
        <label>
          Website
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="e.g. swiggy.com" required disabled={busy} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Working…" : "Generate teardown"}
        </button>
      </form>
      {!busy && !needKey && (
        <p className="hint" style={{ margin: "10px 0 0" }}>
          {freePerDay} free teardowns per person per day. Takes about 1 to 3 minutes.{" "}
          <button type="button" className="ghost" style={{ padding: "2px 8px", fontSize: 13 }} onClick={() => setNeedKey(true)}>
            Use my own API key
          </button>
        </p>
      )}
      {busy && (
        <div className="status" aria-live="polite">
          {steps.map((s, i) => (
            <div key={i} className={`status-line ${i === steps.length - 1 ? "current" : ""}`}>
              {i === steps.length - 1 ? "" : "✓ "}
              {s}
            </div>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {needKey && !busy && (
        <div className="keybox">
          <label>
            Your Claude API key
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: "auto" }} />
            Remember on this device
          </label>
          <p className="hint" style={{ margin: 0 }}>
            Get a key at <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">console.anthropic.com</a>. It is sent only to
            generate your report and is never stored on our server. You pay Anthropic directly for what you use.
          </p>
          <div>
            <button type="button" onClick={() => run()} disabled={!apiKey.trim() && !readKey()}>
              Generate with my key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
