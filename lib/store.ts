import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { FeedbackEntry, StoredTeardown } from "./schema";

/**
 * Storage for teardowns, feedback and daily quota counters.
 * Uses Postgres (e.g. Neon free tier) when DATABASE_URL is set, otherwise a local JSON file for development.
 */
export interface Store {
  get(slug: string): Promise<StoredTeardown | null>;
  findRecentByDomain(domain: string, maxAgeDays: number): Promise<StoredTeardown | null>;
  listRecent(limit: number): Promise<StoredTeardown[]>;
  save(t: StoredTeardown): Promise<void>;
  addFeedback(f: FeedbackEntry): Promise<void>;
  /** Atomically increments a counter for today and returns the new value. */
  bumpCounter(key: string): Promise<number>;
  getCounter(key: string): Promise<number>;
}

const today = () => new Date().toISOString().slice(0, 10);

// ---------- Postgres ----------
function pgStore(url: string): Store {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const init = () =>
    (ready ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS teardowns (
        slug text PRIMARY KEY, company text NOT NULL, domain text NOT NULL, url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), report jsonb NOT NULL, sources jsonb NOT NULL DEFAULT '[]',
        up int NOT NULL DEFAULT 0, down int NOT NULL DEFAULT 0)`;
      await sql`CREATE INDEX IF NOT EXISTS teardowns_domain_idx ON teardowns (domain, created_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS feedback (
        id bigserial PRIMARY KEY, slug text NOT NULL, vote text, comment text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS counters (key text NOT NULL, day date NOT NULL, n int NOT NULL DEFAULT 0, PRIMARY KEY (key, day))`;
    })());
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
        AND created_at > now() - make_interval(days => ${days}) ORDER BY created_at DESC LIMIT 1`;
      return r[0] ? row(r[0]) : null;
    },
    async listRecent(limit) {
      await init();
      const r = await sql`SELECT * FROM teardowns ORDER BY created_at DESC LIMIT ${limit}`;
      return r.map(row);
    },
    async save(t) {
      await init();
      await sql`INSERT INTO teardowns (slug, company, domain, url, created_at, report, sources)
        VALUES (${t.slug}, ${t.company}, ${t.domain}, ${t.url}, ${t.createdAt}, ${JSON.stringify(t.report)}, ${JSON.stringify(t.sources)})`;
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
          .filter((t) => t.domain === domain && Date.parse(t.createdAt) > cutoff)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
      );
    },
    async listRecent(limit) {
      return (await read()).teardowns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
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
  };
}

let store: Store | null = null;
export function getStore(): Store {
  return (store ??= process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore());
}
