// "Build a product" simulation: pure functions shared by the game screen and the balancing script.
// Money is in ₹ lakh. Users are monthly active users. Every stage moves time forward by some months.

export type Stats = {
  month: number;
  cash: number; // ₹ lakh in the bank
  burn: number; // fixed cost per month, ₹ lakh (team, stores, servers)
  users: number; // monthly active users
  growth: number; // new users per month, as % of current users
  retention: number; // % of users still active next month
  arpu: number; // money earned (or lost, if negative) per active user per month, after delivery and discounts, in ₹
  trust: number; // 0-100: users, partners and regulators
  morale: number; // 0-100: the team
};

export type Effects = Partial<Omit<Stats, "month">>;

export type Option = {
  label: string;
  detail?: string;
  effects: Effects;
  /** Something that happens a few stages later because of this choice. */
  later?: { after: number; effects: Effects; note: string }[];
  outcome: string;
  lesson: string;
};

export type Stage = { id: string; phase: string; title: string; situation: string; months: number; options: Option[] };

export type Scenario = {
  id: string;
  title: string;
  icon: string;
  tagline: string;
  pitch: string;
  start: Stats;
  goals: { users: number; trust: number };
  stages: Stage[];
  events: Stage[];
  /** Stage indexes after which a surprise event may happen. */
  eventSlots: number[];
  /** Roughly how many people could ever use it. Growth slows as you get close. */
  market: number;
};

export type Pending = { at: number; effects: Effects; note: string };
export type Game = { stats: Stats; pending: Pending[]; history: { month: number; users: number; cash: number }[] };

export const LIMITS: Record<string, [number, number]> = {
  growth: [0, 60],
  retention: [40, 95],
  trust: [0, 100],
  morale: [0, 100],
  burn: [1, 10000],
  users: [0, 1e9],
};

export const revenue = (s: Stats) => (s.users * s.arpu) / 1e5;

export function start(sc: Scenario): Game {
  return { stats: { ...sc.start }, pending: [], history: [{ month: 0, users: sc.start.users, cash: sc.start.cash }] };
}

export function apply(s: Stats, e: Effects): Stats {
  const n = { ...s };
  for (const [k, v] of Object.entries(e) as [keyof Effects, number][]) {
    n[k] = (n[k] as number) + v;
    const lim = LIMITS[k];
    if (lim) n[k] = Math.min(lim[1], Math.max(lim[0], n[k] as number));
  }
  return n;
}

/** Let time pass: users grow and churn, money comes in and goes out. */
export function tick(sc: Scenario, g: Game, months: number): Game {
  let s = { ...g.stats };
  const history = [...g.history];
  for (let i = 0; i < months; i++) {
    const room = Math.max(0, 1 - s.users / sc.market);
    const net = (s.growth * room - (100 - s.retention)) / 100;
    s.users = Math.max(0, Math.round(s.users * (1 + net)));
    s.cash = Math.round((s.cash + revenue(s) - s.burn) * 10) / 10;
    s.month += 1;
    history.push({ month: s.month, users: s.users, cash: s.cash });
  }
  return { ...g, stats: s, history };
}

/** Effects of earlier choices that land now (step = number of main stages played so far). */
export function due(g: Game, step: number): { game: Game; notes: { note: string; effects: Effects }[] } {
  const now = g.pending.filter((p) => p.at <= step);
  if (!now.length) return { game: g, notes: [] };
  let stats = g.stats;
  for (const p of now) stats = apply(stats, p.effects);
  return { game: { ...g, stats, pending: g.pending.filter((p) => p.at > step) }, notes: now.map((p) => ({ note: p.note, effects: p.effects })) };
}

/** Make a choice, then let the stage's months pass. */
export function choose(sc: Scenario, g: Game, stage: Stage, opt: Option, step: number): Game {
  const stats = apply(g.stats, opt.effects);
  const pending = [...g.pending, ...(opt.later ?? []).map((l) => ({ at: step + l.after, effects: l.effects, note: l.note }))];
  return tick(sc, { ...g, stats, pending }, stage.months);
}

export type Fail = null | { why: string; title: string };
export function failed(s: Stats): Fail {
  if (s.cash <= 0) return { title: "You ran out of money.", why: "Cash hit zero before the business could pay for itself. Most startups die this way, not from rivals." };
  if (s.trust <= 15) return { title: "Nobody trusts you any more.", why: "Users, partners and regulators turned on the product. Trust is slow to build and fast to lose." };
  if (s.morale <= 15) return { title: "Your team walked out.", why: "Key people quit and nobody was left to run the product. Teams are a resource you can burn out too." };
  return null;
}

export type Result = { won: boolean; stars: number; checks: { label: string; ok: boolean; value: string }[] };
export function grade(sc: Scenario, s: Stats): Result {
  const rev = revenue(s);
  const checks = [
    { label: `At least ${sc.goals.users.toLocaleString("en-IN")} monthly users`, ok: s.users >= sc.goals.users, value: s.users.toLocaleString("en-IN") },
    { label: "Money in covers money out each month", ok: rev >= s.burn, value: `₹${rev.toFixed(1)} L in vs ₹${s.burn.toFixed(1)} L out` },
    { label: `Trust at ${sc.goals.trust} or more`, ok: s.trust >= sc.goals.trust, value: String(Math.round(s.trust)) },
  ];
  const n = checks.filter((c) => c.ok).length;
  return { won: n === 3, stars: n, checks };
}
