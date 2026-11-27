// Loads the hand-researched teardowns in curated/*.json into the database, so they show in the gallery.
// Runs before every build (see package.json). Safe to run again: each product keeps one stable slug and is updated in place.
// With DATABASE_URL it writes to Postgres. Without it, LOAD_LOCAL=1 writes to .data/db.json for local testing; otherwise it skips.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(path.join(root, "lib", "seed.json"), "utf8"));
const byDomain = new Map(seed.map((p) => [p.domain, p]));

const REQUIRED = ["company", "tagline", "simpleSummary", "overview", "businessModel", "northStar", "kpiTree", "glossary"];
const slugify = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

const dir = path.join(root, "curated");
const rows = [];
const used = new Set();
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("batch-")).sort()) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  } catch {
    console.warn(`skip ${f}: not valid JSON`);
    continue;
  }
  const key = doc.domain || f.replace(/\.json$/, "");
  const p = byDomain.get(key);
  if (!p) {
    console.warn(`skip ${f}: ${key} is not in lib/seed.json`);
    continue;
  }
  const missing = REQUIRED.filter((k) => !doc.report?.[k]);
  if (missing.length) {
    console.warn(`skip ${f}: missing ${missing.join(", ")}`);
    continue;
  }
  let slug = slugify(p.company);
  if (used.has(slug)) slug = slugify(`${p.company} ${key}`);
  used.add(slug);
  const site = p.website.startsWith("http") ? p.website : `https://${p.website}`;
  rows.push({
    slug,
    company: p.company,
    domain: key,
    url: site,
    report: { ...doc.report, company: p.company, category: doc.report.category || p.category },
    sources: Array.isArray(doc.sources) ? doc.sources : [],
    section: p.section,
  });
}
console.log(`curated teardowns ready: ${rows.length} of ${seed.length}`);

if (process.env.DATABASE_URL) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS teardowns (
    slug text PRIMARY KEY, company text NOT NULL, domain text NOT NULL, url text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), report jsonb NOT NULL, sources jsonb NOT NULL DEFAULT '[]',
    up int NOT NULL DEFAULT 0, down int NOT NULL DEFAULT 0)`;
  await sql`ALTER TABLE teardowns ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE teardowns ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'live'`;
  await sql`CREATE INDEX IF NOT EXISTS teardowns_domain_idx ON teardowns (domain, created_at DESC)`;
  let n = 0;
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows.slice(i, i + 10).map(
        (r) => sql`INSERT INTO teardowns (slug, company, domain, url, report, sources, section, origin)
          VALUES (${r.slug}, ${r.company}, ${r.domain}, ${r.url}, ${JSON.stringify(r.report)}, ${JSON.stringify(r.sources)}, ${r.section}, 'curated')
          ON CONFLICT (slug) DO UPDATE SET company = EXCLUDED.company, domain = EXCLUDED.domain, url = EXCLUDED.url,
            report = EXCLUDED.report, sources = EXCLUDED.sources, section = EXCLUDED.section, origin = 'curated'
          WHERE teardowns.report IS DISTINCT FROM EXCLUDED.report OR teardowns.section IS DISTINCT FROM EXCLUDED.section`,
      ),
    );
    n += Math.min(10, rows.length - i);
  }
  // Tag older live teardowns of listed sites with their gallery section.
  const sections = seed.map((p) => [p.domain, p.section]);
  await sql`UPDATE teardowns t SET section = s.section
    FROM (SELECT * FROM json_to_recordset(${JSON.stringify(sections.map(([domain, section]) => ({ domain, section })))}::json) AS x(domain text, section text)) s
    WHERE t.origin = 'live' AND t.domain = s.domain AND t.section = ''`;
  console.log(`loaded ${n} curated teardowns into Postgres`);
} else if (process.env.LOAD_LOCAL === "1") {
  const file = path.join(root, ".data", "db.json");
  const db = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { teardowns: [], feedback: [], counters: {} };
  const now = new Date().toISOString();
  for (const r of rows) {
    const old = db.teardowns.find((t) => t.slug === r.slug);
    const next = { ...r, url: r.url, createdAt: old?.createdAt ?? now, up: old?.up ?? 0, down: old?.down ?? 0, origin: "curated" };
    if (old) Object.assign(old, next);
    else db.teardowns.push(next);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(db, null, 2));
  console.log(`loaded ${rows.length} curated teardowns into ${file}`);
} else {
  console.log("No DATABASE_URL, skipping curated load.");
}
