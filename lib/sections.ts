import seed from "./seed.json";

export type SeedProduct = {
  rank: number;
  company: string;
  website: string;
  domain: string;
  market: string;
  category: string;
  section: string;
  why: string;
};

export const SEED = seed as SeedProduct[];

/** Gallery sections, in the order of the APM top-200 list. */
export const SECTION_ORDER: string[] = [...new Set(SEED.map((p) => p.section))];

/** Live teardowns of sites outside the list land here. */
export const COMMUNITY_SECTION = "More from the community";

const byDomain = new Map(SEED.map((p) => [p.domain, p]));

export function sectionForDomain(domain: string): string {
  return byDomain.get(domain)?.section ?? COMMUNITY_SECTION;
}

export function sectionSlug(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
