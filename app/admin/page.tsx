import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken, isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | Prodscope", robots: { index: false } };

const ERRORS: Record<string, string> = {
  wrong: "That password is not right.",
  locked: "Too many wrong tries today. Try again tomorrow.",
  unset: "The admin password is not set up yet.",
};

function Stat({ label, w }: { label: string; w: { today: number; week: number; month: number } }) {
  return (
    <div className="stat card">
      <div className="stat-l">{label}</div>
      <div className="stat-v">{w.today}</div>
      <div className="hint">today · {w.week} in 7 days · {w.month} in 30 days</div>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  if (!adminToken()) {
    return (
      <article className="page">
        <h1>Dashboard</h1>
        <p className="lede">The dashboard needs an admin password. Add an environment variable named <code>ADMIN_PASSWORD</code> in the Vercel project settings, then redeploy.</p>
      </article>
    );
  }
  const jar = await cookies();
  if (!isAdmin(jar.get(ADMIN_COOKIE)?.value)) {
    return (
      <article className="page narrow">
        <h1>Dashboard</h1>
        <p className="lede">This page is private. Enter the admin password.</p>
        <form method="post" action="/api/admin/login" className="admin-login">
          <input type="password" name="password" placeholder="Admin password" autoComplete="current-password" required />
          <button className="btn" type="submit">Open dashboard</button>
        </form>
        {e && ERRORS[e] && <p className="error">{ERRORS[e]}</p>}
      </article>
    );
  }

  const s = await getStore().stats();
  return (
    <article className="page wide">
      <div className="admin-head">
        <div>
          <div className="eyebrow">Private</div>
          <h1>Usage dashboard</h1>
        </div>
        <form method="post" action="/api/admin/logout"><button className="act" type="submit">Log out</button></form>
      </div>
      <div className="stats">
        <Stat label="Teardown views" w={s.views} />
        <Stat label="New AI teardowns made" w={s.generations} />
        <Stat label="Practice feedback given" w={s.practice} />
        <div className="stat card">
          <div className="stat-l">Votes</div>
          <div className="stat-v">👍 {s.votes.up} · 👎 {s.votes.down}</div>
          <div className="hint">{s.totals.curated} curated and {s.totals.live} AI teardowns in the library</div>
        </div>
      </div>

      <div className="two">
        <section>
          <h2>Most viewed, last 30 days</h2>
          {s.topViewed.length === 0 ? <p className="hint">No views yet.</p> : (
            <table><tbody>
              {s.topViewed.map((t) => <tr key={t.slug}><td><Link href={`/t/${t.slug}`}>{t.company}</Link></td><td style={{ textAlign: "right" }}>{t.views}</td></tr>)}
            </tbody></table>
          )}
        </section>
        <section>
          <h2>Newest AI teardowns</h2>
          {s.recentLive.length === 0 ? <p className="hint">None yet.</p> : (
            <table><tbody>
              {s.recentLive.map((t) => <tr key={t.slug}><td><Link href={`/t/${t.slug}`}>{t.company}</Link></td><td className="hint">{t.domain}</td><td className="hint">{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td></tr>)}
            </tbody></table>
          )}
        </section>
      </div>

      <section>
        <h2>Latest feedback</h2>
        {s.recentFeedback.length === 0 ? <p className="hint">No feedback yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Teardown</th><th>Vote</th><th>Comment</th><th>When</th></tr></thead>
            <tbody>
              {s.recentFeedback.map((f, i) => (
                <tr key={i}>
                  <td><Link href={`/t/${f.slug}`}>{f.company}</Link></td>
                  <td>{f.vote === "up" ? "👍" : f.vote === "down" ? "👎" : ""}</td>
                  <td>{f.comment}</td>
                  <td className="hint">{new Date(f.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
      <p className="hint">Views count every time a teardown page is opened, including repeat visits. Counting started on 27 Nov 2026.</p>
    </article>
  );
}
