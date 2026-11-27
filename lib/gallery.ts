import { getStore, type GalleryItem } from "./store";
import { COMMUNITY_SECTION, SECTION_ORDER, SEED, sectionSlug } from "./sections";

const seedRank = new Map(SEED.map((p) => [p.domain, p.rank]));

export type Group = { section: string; id: string; items: GalleryItem[] };

/** Every teardown, one per site, grouped into the gallery categories in list order. */
export async function getGroups(): Promise<Group[]> {
  let items: GalleryItem[] = [];
  try {
    items = await getStore().listGallery();
  } catch (e) {
    console.error("gallery load failed", e);
  }
  const order = [...SECTION_ORDER, COMMUNITY_SECTION];
  return order
    .map((section) => ({
      section,
      id: sectionSlug(section),
      items: items
        .filter((t) => (order.includes(t.section) ? t.section : COMMUNITY_SECTION) === section)
        .sort((a, b) => (seedRank.get(a.domain) ?? 999) - (seedRank.get(b.domain) ?? 999) || b.createdAt.localeCompare(a.createdAt)),
    }))
    .filter((g) => g.items.length > 0);
}
