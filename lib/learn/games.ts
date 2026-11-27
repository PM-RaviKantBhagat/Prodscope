import data from "./games.json";

export type Scene = {
  kind: string;
  title: string;
  prompt: string;
  multi?: boolean;
  right: string[];
  wrong: { text: string; from: string }[];
  win: string;
  lose: string;
};
export type Game = { slug: string; company: string; section: string; rank: number; summary: string; lessons: string[]; scenes: Scene[] };

const GAMES = data as unknown as Record<string, Game>;

export function getGame(slug: string): Game | null {
  return GAMES[slug] ?? null;
}

/** Light list for the play hub: no scene text. */
export function gameList() {
  return Object.values(GAMES)
    .sort((a, b) => a.rank - b.rank)
    .map((g) => ({ slug: g.slug, company: g.company, section: g.section }));
}
