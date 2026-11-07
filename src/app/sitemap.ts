import type { MetadataRoute } from "next";
import { getCardText, getCatalog, getLibraryDecks, getSealedCatalog, getTopDemand } from "@/lib/data";
import { sitemapCards, sitemapSealed } from "@/lib/sitemap-core";
import { traitHubs } from "@/lib/traits";
import { COLORS, COLOR_KEYS } from "@/lib/constants";
import { AUTHORS, POSTS, postHref } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";
import { PREORDER_PAGES, upcomingPreorderPages } from "@/lib/preorders";
import { getStoreStats } from "@/lib/data";
import { leaderSlug, PRINTING_FACETS, RARITY_FACETS, TYPE_FACETS } from "@/lib/facets";
import { KEYWORDS } from "@/lib/keywords";
import { STORES } from "@/lib/stores";
import { thinCardIds, upcomingSetIds } from "@/lib/card-index";

// Revalidated daily; reads the same cached loaders as the pages (egress rule 1).
// Private paths (the admin area, account pages) are never listed here.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = [
    "", "/browse", "/price-guide", "/graded", "/sealed", "/black-friday", "/cyber-monday", "/boxing-day", "/january-sales", "/lunar-new-year", "/embed", "/market", "/market/records", "/movers", "/stores", "/sets", "/leaders", "/colors", "/cards", "/cards/all",
    "/tools/deal-finder", "/tools/box-ev", "/tools/pack-sim", "/daily", "/tools/pull-tracker", "/tools/best-basket", "/tools/rising", "/tools/demand", "/trade", "/premium", "/release-dates", "/preorders", "/eb05-preorders", "/op18-preorders", "/stores/suggest", "/how-we-pick-stores", "/stores/partners", "/feedback", "/blog", "/authors", "/creators", "/editorial-policy", "/about", "/methodology", "/contact", "/privacy", "/terms",
    "/tools", "/deck", "/tools/selling-fees", "/singles", "/keywords", "/cards/rarity", "/alerts",
  ].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 }));
  // The five region homes (design track), each a market-locked copy of "/".
  const regions = ["/au", "/uk", "/ca", "/sg", "/eu"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 }));
  fixed.push(...regions);
  const posts = POSTS.map((p) => ({ url: `${SITE_URL}${postHref(p)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 }));
  // A build with no database yet (the very first deploy) still gets a sitemap;
  // the daily revalidation fills in the cards once the import has run.
  let data: [Awaited<ReturnType<typeof getCatalog>>, Awaited<ReturnType<typeof getSealedCatalog>>];
  try {
    data = await Promise.all([getCatalog(), getSealedCatalog()]);
  } catch {
    return [...fixed, ...posts, ...catalogueEntries(null, now)];
  }
  const [cat, sealed] = data;
  // The lean core (lib/sitemap-core.ts): the most searched, viewed and valuable cards
  // and upcoming sets' reveals, not every printing. getTopDemand never throws.
  const demand = await getTopDemand(30, 25);
  const demandIds = [...demand.bySearch, ...demand.byView].map((d) => d.card.id);
  const today = now.toISOString().slice(0, 10);
  const upcoming = upcomingSetIds(cat.sets, today);
  return [
    ...fixed,
    ...posts,
    ...COLOR_KEYS.map((k) => ({ url: `${SITE_URL}/colors/${COLORS[k].slug}`, lastModified: now })),
    ...cat.sets.map((s) => ({ url: `${SITE_URL}/sets/${s.slug}`, lastModified: now })),
    // Every automatic pre-order page (/preorders/<code>) while its set is unreleased; the dedicated ones are in `fixed`.
    ...upcomingPreorderPages(cat.sets, now.toISOString().slice(0, 10)).filter((l) => !PREORDER_PAGES[l.code]).map((l) => ({ url: `${SITE_URL}${l.href}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    // Per-set pack-sim and pull-tracker pages stay live and linked from their tools, but out of the core.
    ...sitemapSealed(sealed, today).map((s) => ({ url: `${SITE_URL}/sealed/${s.slug}`, lastModified: now })),
    // Thin printings are noindex (lib/card-index.ts), so never listed.
    ...sitemapCards(cat.cards, { thin: thinCardIds(cat.cards, upcoming), upcoming, demandIds }).map((c) => ({ url: `${SITE_URL}/card/${c.slug}`, lastModified: now })),
    ...toolsTrackEntries(cat, await getStoreStats().catch(() => []), now),
    // Trait hubs (lib/traits.ts): the index and every type with enough cards.
    ...(await getCardText().then((t) => ["/cards/trait", ...traitHubs(t).map((h) => `/cards/trait/${h.slug}`)]).catch(() => [] as string[])).map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now })),
    ...catalogueEntries(cat, now),
    ...(await deckEntries(now)),
  ];
}

// The public deck library (RiftCompare's sitemap-sections): /decks itself only
// once a deck is live (an empty library is noindexed too), then every live deck
// and each Leader's page. A failed read lists none rather than failing the map.
async function deckEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const decks = await getLibraryDecks().catch(() => []);
  if (!decks.length) return [];
  const leaders = new Map<string, string>();
  for (const d of decks) if (!leaders.has(d.leaderSlug)) leaders.set(d.leaderSlug, d.createdAt);
  return [
    { url: `${SITE_URL}/decks`, changeFrequency: "daily", priority: 0.7, lastModified: new Date(decks[0].createdAt) },
    ...[...leaders].map(([slug, at]) => ({ url: `${SITE_URL}/decks/leader/${slug}`, changeFrequency: "weekly" as const, priority: 0.5, lastModified: new Date(at) })),
    ...decks.map((d) => ({ url: `${SITE_URL}/decks/${d.slug}`, changeFrequency: "weekly" as const, priority: 0.5, lastModified: new Date(d.createdAt) })),
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

// The catalogue track's pages: the guides hub, the gallery hub, support,
// authors. The guides themselves are in `posts` through postHref. A set's
// gallery canonicalises to its set page (RiftCompare #186: the two split the
// set's searches), so it is not listed.
function catalogueEntries(_cat: Awaited<ReturnType<typeof getCatalog>> | null, now: Date): MetadataRoute.Sitemap {
  return [
    "/guides",
    "/gallery",
    "/support",
    "/learn",
    ...AUTHORS.map((a) => `/authors/${a.slug}`),
  ].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now }));
}
