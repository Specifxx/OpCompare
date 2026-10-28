// Everything the homepage and the five region homes render, loaded once per
// ISR render through the cached loaders in lib/data.ts (no cookie, no session:
// the page is one HTML for every market and localises on the client).
import { MARKETS, type Country } from "@/lib/country";
import { getCatalog, getHomeStats, getPopular, getRecentlyUpdated, getSealedCatalog, type CardLite, type Catalog, type SealedLite } from "@/lib/data";
import { SEALED_KINDS } from "@/lib/constants";
import type { SealedShelfItem } from "./HomeSealedShelf";
import type { HomeStats, PopularKind } from "@/lib/home";
import { movers, newestBoosterSet, upcomingSets } from "@/lib/selectors";
import { getTopDeals, type TopDeals } from "@/lib/top-deals";
import type { TileItem } from "./PopularCardsCarousel";
import type { TrendingCard } from "./TrendingChips";

export interface HomeData {
  cat: Catalog;
  stats: HomeStats;
  renderedAt: string;
  popular: TileItem[];
  popularKind: PopularKind;
  chaseSetName?: string;
  trending: TrendingCard[];
  biggestMovers: (TileItem & { pct: number })[];
  recentlyUpdated: (TileItem & { pct: number })[];
  dealsByCountry: Record<Country, TopDeals>;
  nextSet: { name: string; code: string; slug: string; releasedOn: string | null } | null;
  newestSetName?: string;
  newestSetCode?: string;
  sealedShelf: SealedShelfItem[];
  sealedKinds: string[];
}

// The homepage's sealed shelf: booster boxes of the newest released sets, then
// other headline sealed to fill the row. Never pre-orders (their own pages),
// cases or tournament promo packs, and only products with a price somewhere.
const SHELF_FILL = ["Premium Collection", "Double Pack Set", "Illustration Box", "Gift Collection", "Starter Deck"];
export function sealedShelf(cat: Catalog, sealed: SealedLite[], today: string, limit = 8): SealedShelfItem[] {
  const priced = (s: SealedLite) => s.marketUsd != null || Object.values(s.low).some((v) => v != null);
  const released = (s: SealedLite) => !s.presale && (s.releasedOn == null || s.releasedOn <= today);
  const pool = sealed.filter((s) => released(s) && priced(s));
  const newest = (a: SealedLite, b: SealedLite) => (b.releasedOn ?? "").localeCompare(a.releasedOn ?? "") || (b.marketUsd ?? 0) - (a.marketUsd ?? 0);
  const boxes = pool.filter((s) => s.kind === "Booster Box").sort(newest);
  const fill = pool.filter((s) => SHELF_FILL.includes(s.kind)).sort(newest);
  return [...boxes, ...fill].slice(0, limit).map((s) => ({ s, setCode: s.setId != null ? cat.setById.get(s.setId)?.code ?? null : null }));
}

/** A tile's payload: only the fields CardTile reads, so the client props stay small. */
export function tileOf(cat: Catalog, c: CardLite): TileItem {
  return {
    card: {
      id: c.id, slug: c.slug, name: c.name, number: c.number, rarity: c.rarity, variant: c.variant, printing: c.printing,
      hasImage: c.hasImage, marketUsd: c.marketUsd, low: c.low, stores: c.stores,
    },
    setCode: cat.setById.get(c.setId)?.code ?? "",
  };
}

export async function loadHomeData(): Promise<HomeData> {
  const [cat, stats, popular, recent, deals, sealed] = await Promise.all([
    getCatalog(),
    getHomeStats(),
    getPopular(12),
    getRecentlyUpdated(24),
    Promise.all(MARKETS.map((m) => getTopDeals(m))),
    getSealedCatalog().catch(() => [] as SealedLite[]),
  ]);
  const newest = newestBoosterSet(cat.sets);
  // Biggest movers: TCGplayer's 7-day market change is one worldwide figure,
  // so the list is the same for every market (prices still localise).
  const moved = [...movers(cat.cards, "up", 12), ...movers(cat.cards, "down", 12)]
    .sort((a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0))
    .slice(0, 12);
  const next = upcomingSets(cat.sets).find((s) => s.kind === "booster" || s.kind === "extra") ?? null;
  return {
    cat,
    stats,
    renderedAt: new Date().toISOString(),
    popular: popular.cards.map((c) => tileOf(cat, c)),
    popularKind: popular.kind,
    chaseSetName: popular.kind === "chase" ? newest?.name : undefined,
    trending: popular.cards.slice(0, 6).map((c) => ({ id: c.id, slug: c.slug, name: c.name, number: c.number, variant: c.variant })),
    biggestMovers: moved.map((c) => ({ ...tileOf(cat, c), pct: Math.round((c.change7d ?? 0) * 10) / 10 })),
    recentlyUpdated: recent.map((r) => ({ ...tileOf(cat, r.card), pct: r.pct })),
    dealsByCountry: Object.fromEntries(MARKETS.map((m, i) => [m, deals[i]])) as Record<Country, TopDeals>,
    nextSet: next ? { name: next.name, code: next.code, slug: next.slug, releasedOn: next.releasedOn } : null,
    newestSetName: newest?.name,
    newestSetCode: newest?.code,
    sealedShelf: sealedShelf(cat, sealed, new Date().toISOString().slice(0, 10)),
    sealedKinds: SEALED_KINDS.filter((k) => k !== "Promo Pack" && sealed.some((s) => s.kind === k)).slice(0, 8),
  };
}
