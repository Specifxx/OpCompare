import type { MetadataRoute } from "next";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { COLORS, COLOR_KEYS } from "@/lib/constants";
import { POSTS } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// Revalidated daily; reads the same cached loaders as the pages (egress rule 1).
// Private paths (the admin area, account pages) are never listed here.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = [
    "", "/browse", "/price-guide", "/sealed", "/market", "/market/records", "/movers", "/stores", "/sets", "/leaders", "/colors", "/cards", "/cards/all",
    "/tools/deal-finder", "/tools/box-value", "/tools/buy-list", "/premium", "/release-dates", "/stores/suggest", "/feedback", "/blog", "/authors", "/editorial-policy", "/about", "/methodology", "/contact", "/privacy", "/terms",
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
  ];
}
