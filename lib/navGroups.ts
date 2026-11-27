import { getGroups } from "./gallery";

/** The light category list used by pickers and the header menu. */
export async function getNavGroups() {
  return (await getGroups()).map((g) => ({
    section: g.section,
    id: g.id,
    items: g.items.map((t) => ({ slug: t.slug, company: t.company, category: t.category })),
  }));
}
