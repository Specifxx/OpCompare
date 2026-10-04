import type { MetadataRoute } from "next";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { COLORS, COLOR_KEYS } from "@/lib/constants";
import { POSTS } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";
import { getStoreStats } from "@/lib/data";
import { leaderSlug, PRINTING_FACETS, RARITY_FACETS, TYPE_FACETS } from "@/lib/facets";
import { KEYWORDS } from "@/lib/keywords";
import { STORES } from "@/lib/stores";

// Revalidated daily; reads the same cached loaders as the pages (egress rule 1).
// Private paths (the admin area, account pages) are never listed here.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = [
    "", "/browse", "/price-guide", "/sealed", "/market", "/market/records", "/movers", "/stores", "/sets", "/leaders", "/colors", "/cards", "/cards/all",
    "/tools/deal-finder", "/tools/box-ev", "/tools/best-basket", "/tools/rising", "/tools/demand", "/trade", "/decks", "/premium", "/release-dates", "/stores/suggest", "/feedback", "/blog", "/authors", "/editorial-policy", "/about", "/methodology", "/contact", "/privacy", "/terms",
    "/tools", "/deck", "/tools/selling-fees", "/singles", "/keywords", "/cards/rarity",
  ].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 }));
  const posts = POSTS.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 }));
  // A build with no database yet (the very first deploy) still gets a sitemap;
  // the daily revalidation fills in the cards once the import has run.
  let data: [Awaited<ReturnType<typeof getCatalog>>, Awaited<ReturnType<typeof getSealedCatalog>>];
  try {
    data = await Promise.all([getCatalog(), getSealedCatalog()]);
  } catch {
    return [...fixed, ...posts];
  }
  const [cat, sealed] = data;
  return [
    ...fixed,
    ...posts,
    ...COLOR_KEYS.map((k) => ({ url: `${SITE_URL}/colors/${COLORS[k].slug}`, lastModified: now })),
    ...cat.sets.map((s) => ({ url: `${SITE_URL}/sets/${s.slug}`, lastModified: now })),
    ...sealed.filter((s) => s.kind !== "Promo Pack").map((s) => ({ url: `${SITE_URL}/sealed/${s.slug}`, lastModified: now })),
    ...cat.cards.map((c) => ({ url: `${SITE_URL}/card/${c.slug}`, lastModified: now })),
    ...toolsTrackEntries(cat, await getStoreStats().catch(() => []), now),
  ];
}

// The tools track's landing pages: card facets, keywords, one page per Leader
// number and per store with stock (thin store pages are noindex, so not listed).
function toolsTrackEntries(cat: Awaited<ReturnType<typeof getCatalog>>, stats: Awaited<ReturnType<typeof getStoreStats>>, now: Date): MetadataRoute.Sitemap {
  const leaders = new Set(cat.cards.filter((c) => c.cardType === "Leader" && c.number).map((c) => leaderSlug(c.name, c.number)));
  const stocked = new Set(stats.filter((s) => s.inStock >= 10).map((s) => s.source));
  return [
    ...PRINTING_FACETS.map((f) => `/cards/printing/${f.slug}`),
    ...RARITY_FACETS.map((f) => `/cards/rarity/${f.slug}`),
    ...TYPE_FACETS.map((f) => `/cards/type/${f.slug}`),
    ...KEYWORDS.map((k) => `/keywords/${k.slug}`),
    ...[...leaders].map((s) => `/leaders/${s}`),
    ...STORES.filter((s) => stocked.has(`store:${s.key}`)).map((s) => `/stores/${s.key}`),
  ].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now }));
}
