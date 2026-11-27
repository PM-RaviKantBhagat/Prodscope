import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { FeedbackEntry, StoredTeardown } from "./schema";

export type Stats = {
  views: { today: number; week: number; month: number };
  generations: { today: number; week: number; month: number };
  practice: { today: number; week: number; month: number };
  topViewed: { slug: string; company: string; views: number }[];
  votes: { up: number; down: number };
  recentFeedback: { slug: string; company: string; vote: string | null; comment: string; createdAt: string }[];
  recentLive: { slug: string; company: string; domain: string; createdAt: string }[];
  totals: { curated: number; live: number };
};

/** A light row for the gallery, without the full report. */
export type GalleryItem = {
  slug: string;
  company: string;
  domain: string;
  section: string;
  origin: "curated" | "live";
  tagline: string;
  category: string;
  createdAt: string;
  up: number;
};

/**
 * Storage for teardowns, feedback and daily quota counters.
 * Uses Postgres (e.g. Neon free tier) when DATABASE_URL is set, otherwise a local JSON file for development.
 */
export interface Store {
  get(slug: string): Promise<StoredTeardown | null>;
  findRecentByDomain(domain: string, maxAgeDays: number): Promise<StoredTeardown | null>;
  listRecent(limit: number): Promise<StoredTeardown[]>;
  /** One teardown per domain (curated first, then newest), for the category gallery. */
  listGallery(): Promise<GalleryItem[]>;
  save(t: StoredTeardown): Promise<void>;
  addFeedback(f: FeedbackEntry): Promise<void>;
  /** Atomically increments a counter for today and returns the new value. */
  bumpCounter(key: string): Promise<number>;
  getCounter(key: string): Promise<number>;
  /** Usage numbers for the private admin dashboard. */
  stats(): Promise<Stats>;
}

const today = () => new Date().toISOString().slice(0, 10);

// ---------- Postgres ----------
function pgStore(url: string): Store {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const setup = async () => {
    await sql`CREATE TABLE IF NOT EXISTS teardowns (
      slug text PRIMARY KEY, company text NOT NULL, domain text NOT NULL, url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), report jsonb NOT NULL, sources jsonb NOT NULL DEFAULT '[]',
      up int NOT NULL DEFAULT 0, down int NOT NULL DEFAULT 0)`;
    await sql`ALTER TABLE teardowns ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE teardowns ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'live'`;
    await sql`CREATE INDEX IF NOT EXISTS teardowns_domain_idx ON teardowns (domain, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS feedback (
      id bigserial PRIMARY KEY, slug text NOT NULL, vote text, comment text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS counters (key text NOT NULL, day date NOT NULL, n int NOT NULL DEFAULT 0, PRIMARY KEY (key, day))`;
  };
  // Two cold starts can race on CREATE TABLE (Postgres error 23505 or 42P07). Retry once; reset on failure.
  const init = () =>
    (ready ??= setup()
      .catch(async (e: { code?: string }) => {
        if (e?.code !== "23505" && e?.code !== "42P07") throw e;
        await new Promise((r) => setTimeout(r, 300));
        await setup();
      })
      .catch((e) => {
        ready = null;
        throw e;
      }));
  const row = (r: Record<string, unknown>): StoredTeardown => ({
    slug: r.slug as string,
    company: r.company as string,
    domain: r.domain as string,
    url: r.url as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    report: r.report as StoredTeardown["report"],
    sources: r.sources as string[],
    up: r.up as number,
    down: r.down as number,
    section: (r.section as string) ?? "",
    origin: r.origin === "curated" ? "curated" : "live",
  });
  return {
    async get(slug) {
      await init();
      const r = await sql`SELECT * FROM teardowns WHERE slug = ${slug}`;
      return r[0] ? row(r[0]) : null;
    },
    async findRecentByDomain(domain, days) {
      await init();
      const r = await sql`SELECT * FROM teardowns WHERE domain = ${domain}
        AND (origin = 'curated' OR created_at > now() - make_interval(days => ${days}))
        ORDER BY (origin = 'curated') DESC, created_at DESC LIMIT 1`;
      return r[0] ? row(r[0]) : null;
    },
    async listRecent(limit) {
      await init();
      const r = await sql`SELECT * FROM teardowns ORDER BY created_at DESC LIMIT ${limit}`;
      return r.map(row);
    },
    async listGallery() {
      await init();
      const r = await sql`SELECT DISTINCT ON (domain) slug, company, domain, section, origin, created_at, up,
          report->>'tagline' AS tagline, report->>'category' AS category
        FROM teardowns ORDER BY domain, (origin = 'curated') DESC, created_at DESC`;
      return r.map((x) => ({
        slug: x.slug as string,
        company: x.company as string,
        domain: x.domain as string,
        section: (x.section as string) || "",
        origin: x.origin === "curated" ? ("curated" as const) : ("live" as const),
        tagline: (x.tagline as string) ?? "",
        category: (x.category as string) ?? "",
        createdAt: new Date(x.created_at as string).toISOString(),
        up: x.up as number,
      }));
    },
    async save(t) {
      await init();
      await sql`INSERT INTO teardowns (slug, company, domain, url, created_at, report, sources, section, origin)
        VALUES (${t.slug}, ${t.company}, ${t.domain}, ${t.url}, ${t.createdAt}, ${JSON.stringify(t.report)}, ${JSON.stringify(t.sources)}, ${t.section}, ${t.origin})`;
    },
    async addFeedback(f) {
      await init();
      await sql`INSERT INTO feedback (slug, vote, comment) VALUES (${f.slug}, ${f.vote}, ${f.comment})`;
      if (f.vote === "up") await sql`UPDATE teardowns SET up = up + 1 WHERE slug = ${f.slug}`;
      if (f.vote === "down") await sql`UPDATE teardowns SET down = down + 1 WHERE slug = ${f.slug}`;
    },
    async bumpCounter(key) {
      await init();
      const r = await sql`INSERT INTO counters (key, day, n) VALUES (${key}, ${today()}, 1)
        ON CONFLICT (key, day) DO UPDATE SET n = counters.n + 1 RETURNING n`;
      return r[0].n as number;
    },
    async getCounter(key) {
      await init();
      const r = await sql`SELECT n FROM counters WHERE key = ${key} AND day = ${today()}`;
      return (r[0]?.n as number) ?? 0;
    },
    async stats() {
      await init();
      const sums = (rows: Record<string, unknown>[]) => ({
        today: Number(rows[0]?.today ?? 0),
        week: Number(rows[0]?.week ?? 0),
        month: Number(rows[0]?.month ?? 0),
      });
      const window = (key: string) => sql`SELECT
          COALESCE(SUM(n) FILTER (WHERE day = current_date), 0) AS today,
          COALESCE(SUM(n) FILTER (WHERE day > current_date - 7), 0) AS week,
          COALESCE(SUM(n) FILTER (WHERE day > current_date - 30), 0) AS month
        FROM counters WHERE key = ${key}`;
      const [views, gens, practice, top, votes, fb, live, totals] = await Promise.all([
        window("views"),
        window("generations"),
        window("practice"),
        sql`SELECT substring(c.key from 6) AS slug, t.company, SUM(c.n)::int AS views
          FROM counters c JOIN teardowns t ON t.slug = substring(c.key from 6)
          WHERE c.key LIKE 'view:%' AND c.day > current_date - 30
          GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15`,
        sql`SELECT COALESCE(SUM(up), 0)::int AS up, COALESCE(SUM(down), 0)::int AS down FROM teardowns`,
        sql`SELECT f.slug, t.company, f.vote, f.comment, f.created_at FROM feedback f
          LEFT JOIN teardowns t ON t.slug = f.slug ORDER BY f.created_at DESC LIMIT 25`,
        sql`SELECT slug, company, domain, created_at FROM teardowns WHERE origin = 'live' ORDER BY created_at DESC LIMIT 15`,
        sql`SELECT COUNT(*) FILTER (WHERE origin = 'curated')::int AS curated, COUNT(*) FILTER (WHERE origin = 'live')::int AS live FROM teardowns`,
      ]);
      return {
        views: sums(views),
        generations: sums(gens),
        practice: sums(practice),
        topViewed: top.map((x) => ({ slug: x.slug as string, company: x.company as string, views: x.views as number })),
        votes: { up: votes[0].up as number, down: votes[0].down as number },
        recentFeedback: fb.map((x) => ({
          slug: x.slug as string,
          company: (x.company as string) ?? x.slug,
          vote: (x.vote as string) ?? null,
          comment: x.comment as string,
          createdAt: new Date(x.created_at as string).toISOString(),
        })),
        recentLive: live.map((x) => ({ slug: x.slug as string, company: x.company as string, domain: x.domain as string, createdAt: new Date(x.created_at as string).toISOString() })),
        totals: { curated: totals[0].curated as number, live: totals[0].live as number },
      };
    },
  };
}

// ---------- Local JSON file (development only) ----------
type FileDb = { teardowns: StoredTeardown[]; feedback: FeedbackEntry[]; counters: Record<string, number> };
function fileStore(): Store {
  const file = path.join(process.cwd(), ".data", "db.json");
  let lock: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<FileDb> => {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      return { teardowns: [], feedback: [], counters: {} };
    }
  };
  const write = async (db: FileDb) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(db, null, 2));
  };
  const mutate = <T>(fn: (db: FileDb) => T): Promise<T> => {
    const p = lock.then(async () => {
      const db = await read();
      const out = fn(db);
      await write(db);
      return out;
    });
    lock = p.catch(() => undefined);
    return p;
  };
  return {
    async get(slug) {
      return (await read()).teardowns.find((t) => t.slug === slug) ?? null;
    },
    async findRecentByDomain(domain, days) {
      const cutoff = Date.now() - days * 86_400_000;
      return (
        (await read()).teardowns
          .filter((t) => t.domain === domain && (t.origin === "curated" || Date.parse(t.createdAt) > cutoff))
          .sort((a, b) => Number(b.origin === "curated") - Number(a.origin === "curated") || b.createdAt.localeCompare(a.createdAt))[0] ?? null
      );
    },
    async listRecent(limit) {
      return (await read()).teardowns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    },
    async listGallery() {
      const best = new Map<string, StoredTeardown>();
      for (const t of (await read()).teardowns) {
        const cur = best.get(t.domain);
        const better = !cur || (t.origin === "curated" && cur.origin !== "curated") || (t.origin === cur.origin && t.createdAt > cur.createdAt);
        if (better) best.set(t.domain, t);
      }
      return [...best.values()].map((t) => ({
        slug: t.slug, company: t.company, domain: t.domain, section: t.section ?? "", origin: t.origin ?? "live",
        tagline: t.report.tagline, category: t.report.category, createdAt: t.createdAt, up: t.up,
      }));
    },
    save: (t) => mutate((db) => void db.teardowns.push(t)),
    addFeedback: (f) =>
      mutate((db) => {
        db.feedback.push(f);
        const t = db.teardowns.find((x) => x.slug === f.slug);
        if (t && f.vote === "up") t.up++;
        if (t && f.vote === "down") t.down++;
      }),
    bumpCounter: (key) =>
      mutate((db) => {
        const k = `${key}:${today()}`;
        db.counters[k] = (db.counters[k] ?? 0) + 1;
        return db.counters[k];
      }),
    async getCounter(key) {
      return (await read()).counters[`${key}:${today()}`] ?? 0;
    },
    async stats() {
      const db = await read();
      const sum = (key: string, days: number) => {
        let n = 0;
        for (const [k, v] of Object.entries(db.counters)) {
          const day = k.slice(-10);
          if (k.slice(0, -11) === key && Date.now() - Date.parse(day) < days * 86_400_000) n += v;
        }
        return n;
      };
      const win = (key: string) => ({ today: sum(key, 1), week: sum(key, 7), month: sum(key, 30) });
      const top = db.teardowns
        .map((t) => ({ slug: t.slug, company: t.company, views: sum(`view:${t.slug}`, 30) }))
        .filter((x) => x.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 15);
      return {
        views: win("views"),
        generations: win("generations"),
        practice: win("practice"),
        topViewed: top,
        votes: { up: db.teardowns.reduce((n, t) => n + t.up, 0), down: db.teardowns.reduce((n, t) => n + t.down, 0) },
        recentFeedback: db.feedback.slice(-25).reverse().map((f) => ({
          slug: f.slug, company: db.teardowns.find((t) => t.slug === f.slug)?.company ?? f.slug, vote: f.vote, comment: f.comment, createdAt: f.createdAt,
        })),
        recentLive: db.teardowns.filter((t) => t.origin !== "curated").slice(-15).reverse().map((t) => ({ slug: t.slug, company: t.company, domain: t.domain, createdAt: t.createdAt })),
        totals: { curated: db.teardowns.filter((t) => t.origin === "curated").length, live: db.teardowns.filter((t) => t.origin !== "curated").length },
      };
    },
  };
}

let store: Store | null = null;
export function getStore(): Store {
  return (store ??= process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore());
}
