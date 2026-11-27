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
    <div>
      <form className="form" onSubmit={run}>
        <div className="stack">
          <div className="field">
            <span className="marker dot" />
            <label className="sr" htmlFor="company">Company name</label>
            <input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name, e.g. Swiggy" required disabled={busy} />
          </div>
          <div className="field">
            <span className="marker" />
            <label className="sr" htmlFor="site">Website</label>
            <input id="site" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Website, e.g. swiggy.com" required disabled={busy} />
          </div>
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Working…" : "Get teardown"}
        </button>
      </form>
      {!busy && !needKey && (
        <div className="form-foot" style={{ marginTop: 14 }}>
          <span>{freePerDay} free a day · about 1 to 3 minutes</span>
          <button type="button" className="link" onClick={() => setNeedKey(true)}>
            Use my own API key
          </button>
        </div>
      )}
      {busy && (
        <div className="status" aria-live="polite">
          {steps.map((s, i) => (
            <div key={i} className={`status-line ${i === steps.length - 1 ? "current" : ""}`}>
              {i === steps.length - 1 ? "" : "✓"}
              {s}
            </div>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {needKey && !busy && (
        <div className="keybox">
          <label className="hint" htmlFor="apikey" style={{ fontWeight: 600, color: "inherit" }}>Your Gemini API key</label>
            <input id="apikey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember on this device
          </label>
          <p className="hint" style={{ margin: 0 }}>
            Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. It is sent only to
            generate your report and is never stored on our server.
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
