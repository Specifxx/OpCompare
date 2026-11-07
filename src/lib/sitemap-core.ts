// The sitemap lists a lean core, not every page (SEO audit, 2026-11-07: 5,901 of
// ~8,700 URLs "Discovered – currently not indexed"). A young domain with few links
// gets a small crawl budget; a sitemap of thousands of templated card pages tells
// Google the site is templated and it samples instead of indexing. Every page left
// out stays live, indexable and linked from its set, its siblings and the lists;
// it just isn't advertised. Widen the caps once Search Console shows the core
// mostly indexed. DECISIONS.md, 2026-11-07. Pinned by tests/sitemap-core.test.ts.
import type { CardLite, SealedLite } from "./data";

/** Cards by TCGplayer market price that the sitemap lists (plus demand and spoilers). */
export const SITEMAP_TOP_CARDS = 250;
/** Revealed cards of an unreleased set listed, newest set first (spoiler searches). */
export const SITEMAP_UPCOMING_CARDS = 100;

type Card = Pick<CardLite, "id" | "slug" | "setId" | "marketUsd">;

/**
 * The card pages the sitemap lists: the most valuable printings, the cards
 * visitors search and open most (`demandIds`), and revealed cards of unreleased
 * sets, never a thin (noindex) printing. Order: demand, upcoming, value.
 */
export function sitemapCards<C extends Card>(cards: readonly C[], opts: { thin: ReadonlySet<number>; upcoming: ReadonlySet<number>; demandIds?: readonly number[] }): C[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const out = new Map<number, C>();
  const add = (c: C | undefined) => { if (c && !opts.thin.has(c.id) && !out.has(c.id)) out.set(c.id, c); };
  for (const id of opts.demandIds ?? []) add(byId.get(id));
  cards.filter((c) => opts.upcoming.has(c.setId)).slice(0, SITEMAP_UPCOMING_CARDS).forEach(add);
  cards
    .filter((c) => c.marketUsd != null && !opts.thin.has(c.id))
    .sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0) || a.id - b.id)
    .slice(0, SITEMAP_TOP_CARDS)
    .forEach(add);
  return [...out.values()];
}

type Sealed = Pick<SealedLite, "kind" | "stores" | "presale" | "releasedOn">;

/** Sealed pages worth listing: two or more stores in one market, or a product still to release. */
export function sitemapSealed<S extends Sealed>(sealed: readonly S[], today: string): S[] {
  return sealed.filter((s) => s.kind !== "Promo Pack" && (Object.values(s.stores).some((n) => n >= 2) || s.presale || (!!s.releasedOn && s.releasedOn > today)));
}
