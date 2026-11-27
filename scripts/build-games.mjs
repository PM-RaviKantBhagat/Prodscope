// Turns the 200 curated teardowns into "Play the product" games (lib/learn/games.json).
// Each game is 9 scenes. Each scene has the right card (from this product) and 5 wrong cards
// (taken from products in other categories, so they are clearly wrong for this one).
// Runs before every build. Deterministic: the same input gives the same file.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(path.join(root, "lib", "seed.json"), "utf8"));
const byDomain = new Map(seed.map((p) => [p.domain, p]));
const slugify = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

// Same slug rules as scripts/load-curated.mjs, so games link to the right teardown.
const dir = path.join(root, "curated");
const products = [];
const used = new Set();
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("batch-")).sort()) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  } catch {
    continue;
  }
  const key = doc.domain || f.replace(/\.json$/, "");
  const p = byDomain.get(key);
  if (!p || !doc.report?.northStar) continue;
  let slug = slugify(p.company);
  if (used.has(slug)) slug = slugify(`${p.company} ${key}`);
  used.add(slug);
  products.push({ slug, company: p.company, section: p.section, category: p.category, rank: p.rank, r: doc.report });
}

// Small seeded random so the file is stable between builds.
function rng(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Cut text to a readable card: first sentence, at most ~max chars, on a word boundary. */
function short(s, max = 150) {
  if (!s) return "";
  let t = String(s).replace(/\s+/g, " ").trim();
  const dot = t.search(/[.!?](\s|$)/);
  if (dot > 30 && dot < max) t = t.slice(0, dot + 1);
  if (t.length > max) t = t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,;:(\-]+$/, "") + "...";
  return t;
}
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const lowerFirst = (s) => {
  if (!s) return s;
  const w = s.split(/\s/)[0];
  // Keep names like "Zepto", "Ray-Ban", "UPI" or "iPhone" as they are.
  if (/[A-Z]/.test(w.slice(1)) || NAMES.has(w.replace(/[^A-Za-z0-9]/g, ""))) return s;
  return s[0].toLowerCase() + s.slice(1);
};

/** Words that could make a wrong card look right for this product. */
function tooClose(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return true;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const wa = new Set(x.split(" ").filter((w) => w.length > 3));
  const wb = y.split(" ").filter((w) => w.length > 3);
  if (!wb.length || !wa.size) return false;
  const shared = wb.filter((w) => wa.has(w)).length;
  return shared / Math.min(wa.size, wb.length) >= 0.6;
}

const firstWord = (s) => norm(s).split(" ")[0] || "";
/** Names that would make a wrong card look right: the product itself and its listed rivals. */
function namesFor(game) {
  const names = [game.company, ...(game.r.competitors || []).map((c) => c.name)];
  return names.flatMap((n) => n.split(/[(),/]| and /)).map(firstWord).filter((w) => w.length > 2);
}
function isRival(game, o) {
  const names = namesFor(game);
  return names.includes(firstWord(o.company));
}

/**
 * Pick n wrong cards. Most come from products in other categories. When `near` is set, about half
 * come from the same category (but never a listed rival and never the same kind of product), which
 * makes them look believable: that is what makes the game hard.
 */
function decoys(game, pick, avoid, n = 6, near = false) {
  const rand = rng(`${game.slug}:${avoid[0]}`);
  const far = products.filter((o) => o.section !== game.section);
  const close = products.filter((o) => o.section === game.section && o.slug !== game.slug && o.category !== game.category && !isRival(game, o));
  const banned = namesFor(game);
  const out = [];
  for (let tries = 0; out.length < n && tries < 600; tries++) {
    const pool = near && close.length && out.length % 2 === 0 ? close : far;
    const o = pool[Math.floor(rand() * pool.length)];
    const list = pick(o).filter(Boolean);
    if (!list.length) continue;
    const text = list[Math.floor(rand() * list.length)];
    const words = new Set(norm(text).split(" "));
    // A card that names this product, one of its rivals, or its own company gives the game away.
    if (banned.some((w) => words.has(w)) || (text !== o.company && words.has(firstWord(o.company)))) continue;
    if ([...avoid, ...out.map((d) => d.text)].some((a) => tooClose(a, text))) continue;
    out.push({ text, from: o.company });
  }
  return out;
}

const personaText = (p) => short(`${p.name}: ${lowerFirst(p.description || "")}`, 140);

const NAMES = new Set(products.flatMap((p) => p.company.split(/[\s()/]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, ""))).filter(Boolean));
const games = {};
for (const g of products) {
  const r = g.r;
  const C = g.company;
  const persona = r.personas?.[0];
  const pains = [...(r.painPoints || [])].sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity]);
  const pain = pains[0];
  const feature = r.coreFeatures?.[0];
  const stream = r.businessModel?.revenueStreams?.[0];
  const tree = (r.kpiTree || []).slice(0, 3);
  const growth = (r.growth?.howTheyGetUsers || []).slice(0, 2);
  const rival = r.competitors?.[0];
  const idea = r.improvementIdeas?.[0];
  if (!persona || !pain || !feature || !stream || tree.length < 2 || growth.length < 2 || !rival || !idea) continue;

  const scenes = [];
  const one = (s) => scenes.push(s);

  one({
    kind: "users",
    title: "Who is it for?",
    prompt: `Day 1. You are the new PM of ${C}. ${short(r.tagline, 160)} Who do you build for first?`,
    right: [personaText(persona)],
    wrong: decoys(g, (o) => (o.r.personas || []).map(personaText), (r.personas || []).map(personaText)),
    win: `Right. ${short(persona.description, 160)} They want: ${(persona.goals || []).slice(0, 2).map(lowerFirst).join("; ")}.`,
    lose: `You built for the wrong crowd. They try ${C} once and leave. Hint: ${C}'s real users want things like "${lowerFirst(persona.goals?.[0] || "")}".`,
  });
  one({
    kind: "pain",
    title: "What hurts?",
    prompt: `You sit with a few of these users. Which problem do they keep bringing up?`,
    right: [short(pain.pain)],
    wrong: decoys(g, (o) => (o.r.painPoints || []).map((x) => short(x.pain)), pains.map((x) => short(x.pain))),
    win: `Yes. ${C} solves it like this: ${short(pain.howSolved, 180)}`,
    lose: `You fixed a problem these users rarely have. Hint: one thing that frustrates them is "${lowerFirst(persona.frustrations?.[0] || pains[1]?.pain || "")}".`,
  });
  one({
    kind: "feature",
    title: "Build the core",
    prompt: `You can build one thing first. Which feature becomes the heart of ${C}?`,
    right: [short(`${feature.feature}: ${lowerFirst(feature.whatItDoes)}`, 150)],
    wrong: decoys(g, (o) => (o.r.coreFeatures || []).map((x) => short(`${x.feature}: ${lowerFirst(x.whatItDoes)}`, 150)), (r.coreFeatures || []).map((x) => x.feature), 6, true),
    win: `Good call. ${short(feature.whyItMatters, 180)}`,
    lose: `Users shrug. That feature belongs to a different kind of product. Hint: ${C}'s promise is "${short(r.overview?.valueProposition, 130)}"`,
  });
  one({
    kind: "money",
    title: "Make money",
    prompt: `Investors ask: where will most of ${C}'s money come from?`,
    right: [short(`${stream.stream}: ${lowerFirst(stream.detail)}`, 150)],
    wrong: decoys(g, (o) => (o.r.businessModel?.revenueStreams || []).map((x) => short(`${x.stream}: ${lowerFirst(x.detail)}`, 150)), (r.businessModel?.revenueStreams || []).map((x) => x.stream), 6, true),
    win: `That's it. ${short(r.businessModel.summary, 200)}`,
    lose: `Revenue barely moves, and runway shrinks. Hint, look at how ${C} prices things: "${short(r.businessModel?.pricing, 140)}"`,
  });
  one({
    kind: "northstar",
    title: "Pick the north star",
    prompt: `The team needs one number to chase every week. Which north star fits ${C}?`,
    right: [short(r.northStar.metric, 140)],
    wrong: decoys(g, (o) => [short(o.r.northStar?.metric, 140)], [r.northStar.metric], 6, true),
    win: `Yes. ${short(r.northStar.why, 200)}`,
    lose: `The team chases the wrong number and the product drifts. Hint: a good north star counts the moment a ${C} user gets real value.`,
  });
  const treeRight = tree.map((t) => short(t.metric, 70));
  one({
    kind: "tree",
    title: "Build the KPI tree",
    prompt: `Your north star is "${short(r.northStar.metric, 110)}". Pick all ${treeRight.length} numbers that directly drive it.`,
    multi: true,
    right: treeRight,
    wrong: decoys(g, (o) => (o.r.kpiTree || []).map((t) => short(t.metric, 70)), (r.kpiTree || []).flatMap((t) => [t.metric, ...(t.children || []).map((c) => c.metric)]), 6),
    win: `Your tree holds. ${tree.map((t) => `${short(t.metric, 60)}: ${lowerFirst(short(t.description, 90))}`).join(" ")}`,
    lose: `Your tree has the wrong branches, so the team works on numbers that don't move the goal. Hint: "${short(tree[0].metric, 60)}" is one real driver.`,
  });
  one({
    kind: "growth",
    title: "Grow",
    prompt: `Time to grow. Pick the 2 ways ${C} really gets new users.`,
    multi: true,
    right: growth.map((x) => short(x, 120)),
    wrong: decoys(g, (o) => (o.r.growth?.howTheyGetUsers || []).map((x) => short(x, 120)), r.growth.howTheyGetUsers, 6),
    win: `That's how ${C} grows. What brings people back: ${lowerFirst(short(r.growth?.whatBringsUsersBack?.[0], 120))}`,
    lose: `You spend a lot and users don't come. Hint: what keeps ${C} users coming back is "${lowerFirst(short(r.growth?.whatBringsUsersBack?.[0], 110))}"`,
  });
  one({
    kind: "rival",
    title: "Know your rival",
    prompt: `A rival is going after your users. Who should ${C} watch most closely?`,
    right: [rival.name],
    wrong: decoys(g, (o) => [o.company], [C, ...(r.competitors || []).map((c) => c.name)], 6, true),
    win: `Right. ${short(rival.positioning, 150)} How ${C} differs: ${lowerFirst(short(rival.howThisProductDiffers, 150))}`,
    lose: `You watched the wrong company, and the real rival takes your users. Hint, they are described as: "${short(rival.positioning, 130)}"`,
  });
  const num = (r.keyNumbers || []).find((k) => k.value && k.label && !norm(k.label + k.value).includes(firstWord(C)));
  if (num) {
    const numText = (k) => short(`${k.label}: ${k.value}`, 130);
    one({
      kind: "numbers",
      title: "Know your numbers",
      prompt: `The board asks for one real number about ${C}. Which of these is true?`,
      right: [numText(num)],
      wrong: decoys(g, (o) => (o.r.keyNumbers || []).map(numText), (r.keyNumbers || []).map(numText), 6, true),
      win: `Correct. ${num.note ? `Source: ${short(num.note, 120)}` : ""}`.trim(),
      lose: `That number belongs to another product. Hint: look for the one that fits ${C}'s size and model: ${lowerFirst(short(r.businessModel?.unitEconomics, 120))}`,
    });
  }
  const guard = r.guardrailMetrics?.[0];
  if (guard) {
    one({
      kind: "guardrail",
      title: "Set a guardrail",
      prompt: `You push hard on "${short(r.northStar.metric, 90)}". Which number must NOT get worse while you do?`,
      right: [short(guard, 130)],
      wrong: decoys(g, (o) => (o.r.guardrailMetrics || []).map((x) => short(x, 130)), r.guardrailMetrics),
      win: `Right. Guardrails stop you from winning the wrong way. ${C} also watches: ${(r.guardrailMetrics || []).slice(1, 3).map((x) => lowerFirst(short(x, 70))).join("; ")}.`,
      lose: `You hit your goal but broke something users care about. Hint: think about what pushing "${short(r.northStar.metric, 70)}" too hard could damage at ${C}.`,
    });
  }
  const complaint = r.userComplaints?.[0];
  if (complaint) {
    one({
      kind: "complaints",
      title: "Read the reviews",
      prompt: `You open the app store reviews. Which complaint do ${C} users really make?`,
      right: [short(complaint, 140)],
      wrong: decoys(g, (o) => (o.r.userComplaints || []).map((x) => short(x, 140)), r.userComplaints),
      win: `Yes. Other complaints you'll see: ${(r.userComplaints || []).slice(1, 3).map((x) => lowerFirst(short(x, 80))).join("; ")}.`,
      lose: `That complaint comes from a different product's users. Hint: ${C} users get frustrated by things like "${lowerFirst(short(persona.frustrations?.[1] || persona.frustrations?.[0], 100))}"`,
    });
  }
  one({
    kind: "crisis",
    title: "Crisis",
    prompt: `Trouble. ${short(idea.problem, 170)} What do you ship?`,
    right: [short(idea.idea, 150)],
    wrong: decoys(g, (o) => (o.r.improvementIdeas || []).map((x) => short(x.idea, 150)), (r.improvementIdeas || []).map((x) => x.idea)),
    win: `Shipped. ${short(idea.expectedImpact, 150)} You track it with: ${lowerFirst(short(idea.metricToTrack, 100))}.`,
    lose: `The fix misses the problem and complaints grow. Hint: the right fix would move "${lowerFirst(short(idea.metricToTrack, 100))}".`,
  });

  const thin = scenes.filter((s) => s.wrong.length < 4).map((s) => `${s.kind}:${s.wrong.length}`);
  if (process.env.DEBUG_GAMES && thin.length) console.log(g.slug, thin.join(" "));
  if (thin.length) continue;
  games[g.slug] = {
    slug: g.slug,
    company: C,
    section: g.section,
    rank: g.rank,
    summary: short(r.simpleSummary, 260),
    lessons: (r.pmLessons || []).slice(0, 3).map((x) => short(x, 200)),
    scenes,
  };
}

writeFileSync(path.join(root, "lib", "learn", "games.json"), JSON.stringify(games));
console.log(`product games ready: ${Object.keys(games).length} of ${products.length}`);
