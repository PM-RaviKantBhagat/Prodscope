// Checks how hard a "Build a product" story is.
// node --experimental-strip-types scripts/balance-sim.mts lib/sim/scenarios/quickbasket.json
import { readFileSync } from "node:fs";
import { start, choose, due, failed, grade, revenue, type Scenario, type Game } from "../lib/sim/engine.ts";

const sc: Scenario = JSON.parse(readFileSync(process.argv[2], "utf8"));
const N = sc.stages.length;

function run(path: number[], events: [number, number][] = []): { g: Game; fail: string | null; stars: number } {
  let g = start(sc);
  for (let i = 0; i < N; i++) {
    g = due(g, i).game;
    g = choose(sc, g, sc.stages[i], sc.stages[i].options[path[i]], i);
    const f = failed(g.stats);
    if (f) return { g, fail: `${f.title} (stage ${i + 1})`, stars: 0 };
    for (const [slot, opt] of events) if (slot === i) {
      const ev = sc.events[(i * 7) % sc.events.length];
      g = choose(sc, g, ev, ev.options[opt], i);
    }
  }
  g = due(g, N).game;
  const r = grade(sc, g.stats);
  return { g, fail: null, stars: r.won ? 3 : r.stars };
}

// Exhaustive search over every path (no surprise events).
let total = 0, wins = 0, fails = 0;
const stars = [0, 0, 0, 0];
let best: { path: number[]; g: Game } | null = null;
const failWhy: Record<string, number> = {};
const path: number[] = [];
function dfs(i: number) {
  if (i === N) {
    total++;
    const r = run(path);
    if (r.fail) { fails++; const k = r.fail.split(" (")[0]; failWhy[k] = (failWhy[k] ?? 0) + 1; return; }
    stars[r.stars]++;
    if (r.stars === 3) { wins++; if (!best || r.g.stats.users > best.g.stats.users) best = { path: [...path], g: r.g }; }
    return;
  }
  for (let o = 0; o < sc.stages[i].options.length; o++) { path[i] = o; dfs(i + 1); }
}
if (!process.env.ONLY) dfs(0);
console.log(`${sc.title}: ${total} paths, wins ${wins} (${((wins / total) * 100).toFixed(3)}%), failed ${((fails / total) * 100).toFixed(1)}%`, failWhy, "stars", stars);
if (best) {
  const s = best.g.stats;
  console.log("best path", best.path.join(""), `users ${s.users} cash ${s.cash} rev ${revenue(s).toFixed(1)} burn ${s.burn} trust ${s.trust} month ${s.month}`);
}
// The "sensible PM" path I expect to win, passed as argv[3] like 1000...
if (process.argv[3]) {
  const p = process.argv[3].split("").map(Number);
  const r = run(p);
  const s = r.g.stats;
  console.log("given path", r.fail ?? `stars ${r.stars}`, `users ${s.users} cash ${s.cash} rev ${revenue(s).toFixed(1)} burn ${s.burn} arpu ${s.arpu} ret ${s.retention} growth ${s.growth} trust ${s.trust} morale ${s.morale}`);
  console.log(r.g.history.map((h) => `${h.month}:${Math.round(h.users / 1000)}k/₹${Math.round(h.cash)}`).join(" "));
}
