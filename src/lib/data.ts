// The self-cached loaders every page reads through (egress rules: lib/db.ts).
// Each is an unstable_cache tagged "prices" (purged by the import's POST
// /api/revalidate), with a 6h TTL as the backstop. Never wrap these in another
// unstable_cache and never call one inside an unstable_cache callback.
import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { MARKETS, type Country } from "./country";
import { slugify } from "./catalog";

export const PRICES_TAG = "prices";
const TTL = 60 * 60 * 6;

// ── The catalogue: every printing, compact ───────────────────────────────────
// Two cache entries, both ordered by id: the card FACTS (change only when the
// catalogue does) and the PRICES. Tuples, not objects: as objects the ~7,300
// rows measured 3.7 MB against the Data Cache's ~2 MB item ceiling; split into
// tuples each half is well under 1 MB, with room for years of new sets.
type CoreTuple = [
  id: number,
  slug: string | 0, // 0 = the derived slug (cardSlugBase) — most rows
  name: string,
  number: string | null,
  setId: number,
  rarity: string | null,
  variant: string | null,
  printing: string,
  colors: string,
  cardType: string | null,
  cost: number | null,
  power: number | null,
  counter: number | null,
  life: number | null,
  hasImage: 0 | 1,
];
type PriceTuple = [
  marketUsd: number | null,
  low: (number | null)[] | 0, // per MARKETS order; 0 = no price anywhere
  stores: number[] | 0, // per MARKETS order; 0 = no store anywhere
  change7d: number | null,
  change30d: number | null,
  high90Usd: number | null,
];

/** The slug a printing is given when nothing collides (lib/catalog.ts parseCard). */
export function cardSlugBase(name: string, number: string | null, variant: string | null, setCode: string | undefined): string {
  return slugify([name, number ?? (name === "DON!! Card" ? setCode : null), variant].filter(Boolean).join(" "));
}

export interface CardLite {
  id: number;
  slug: string;
  name: string;
  number: string | null;
  setId: number;
  rarity: string | null;
  variant: string | null;
  printing: string;
  colors: string[];
  cardType: string | null;
  cost: number | null;
  power: number | null;
  counter: number | null;
  life: number | null;
  hasImage: boolean;
  marketUsd: number | null;
  low: Record<Country, number | null>;
  stores: Record<Country, number>;
  change7d: number | null;
  change30d: number | null;
  high90Usd: number | null;
}

export interface SetLite {
  id: number;
  slug: string;
  code: string;
  name: string;
  kind: string;
  releasedOn: string | null;
  cardCount: number;
  sealedCount: number;
}

const loadCore = unstable_cache(
  async (): Promise<{ cards: CoreTuple[]; sets: SetLite[] }> => {
    const [rows, sets] = await Promise.all([
      prisma.card.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true, slug: true, name: true, number: true, setId: true, rarity: true, variant: true, printing: true, colors: true,
          cardType: true, cost: true, power: true, counter: true, life: true, hasImage: true,
        },
      }),
      prisma.set.findMany({ select: { id: true, slug: true, code: true, name: true, kind: true, releasedOn: true, cardCount: true, sealedCount: true } }),
    ]);
    const codeOf = new Map(sets.map((s) => [s.id, s.code]));
    return {
      cards: rows.map((r): CoreTuple => {
        const derived = cardSlugBase(r.name, r.number, r.variant, codeOf.get(r.setId));
        return [
          r.id, r.slug === derived ? 0 : r.slug, r.name, r.number, r.setId, r.rarity, r.variant, r.printing, r.colors.join(";"),
          r.cardType, r.cost, r.power, r.counter, r.life, r.hasImage ? 1 : 0,
        ];
      }),
      sets: sets.map((s) => ({ ...s, releasedOn: s.releasedOn ? s.releasedOn.toISOString().slice(0, 10) : null })),
    };
  },
  ["catalog-core-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

const loadPrices = unstable_cache(
  async (): Promise<{ ids: number[]; prices: PriceTuple[]; at: string }> => {
    const rows = await prisma.card.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true, marketUsd: true, change7d: true, change30d: true, high90Usd: true,
        lowUS: true, lowAU: true, lowUK: true, lowSG: true, lowCA: true, lowEU: true,
        storesUS: true, storesAU: true, storesUK: true, storesSG: true, storesCA: true, storesEU: true,
      },
    });
    return {
      ids: rows.map((r) => r.id),
      prices: rows.map((r): PriceTuple => {
        const low = [r.lowUS, r.lowAU, r.lowUK, r.lowSG, r.lowCA, r.lowEU];
        const stores = [r.storesUS, r.storesAU, r.storesUK, r.storesSG, r.storesCA, r.storesEU];
        return [r.marketUsd, low.every((x) => x == null) ? 0 : low, stores.every((x) => x === 0) ? 0 : stores, r.change7d, r.change30d, r.high90Usd];
      }),
      at: new Date().toISOString(),
    };
  },
  ["catalog-prices-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

const NO_PRICE: PriceTuple = [null, 0, 0, null, null, null];

function decode(t: CoreTuple, p: PriceTuple, setCode: string | undefined): CardLite {
  const low = {} as Record<Country, number | null>;
  const stores = {} as Record<Country, number>;
  MARKETS.forEach((m, i) => {
    low[m] = p[1] === 0 ? null : p[1][i];
    stores[m] = p[2] === 0 ? 0 : p[2][i];
  });
  return {
    id: t[0], slug: t[1] === 0 ? cardSlugBase(t[2], t[3], t[6], setCode) : t[1], name: t[2], number: t[3], setId: t[4],
    rarity: t[5], variant: t[6], printing: t[7], colors: t[8] ? t[8].split(";") : [], cardType: t[9], cost: t[10],
    power: t[11], counter: t[12], life: t[13], hasImage: t[14] === 1,
    marketUsd: p[0], low, stores, change7d: p[3], change30d: p[4], high90Usd: p[5],
  };
}

// A warm lambda keeps the decoded catalogue for a few minutes, so a burst of
// requests reads the Data Cache once rather than once each.
let memo: { at: number; value: Catalog } | null = null;
const MEMO_MS = 5 * 60 * 1000;

export interface Catalog {
  cards: CardLite[];
  sets: SetLite[];
  setById: Map<number, SetLite>;
  setBySlug: Map<string, SetLite>;
  bySlug: Map<string, CardLite>;
  byId: Map<number, CardLite>;
  pricesAt: string;
}

export async function getCatalog(): Promise<Catalog> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  const [core, pr] = await Promise.all([loadCore(), loadPrices()]);
  const codeOf = new Map(core.sets.map((s) => [s.id, s.code]));
  const priceById = new Map<number, PriceTuple>();
  pr.ids.forEach((id, i) => priceById.set(id, pr.prices[i]));
  const cards = core.cards.map((t) => decode(t, priceById.get(t[0]) ?? NO_PRICE, codeOf.get(t[4])));
  const value: Catalog = {
    cards,
    sets: core.sets,
    setById: new Map(core.sets.map((s) => [s.id, s])),
    setBySlug: new Map(core.sets.map((s) => [s.slug, s])),
    bySlug: new Map(cards.map((c) => [c.slug, c])),
    byId: new Map(cards.map((c) => [c.id, c])),
    pricesAt: pr.at,
  };
  memo = { at: Date.now(), value };
  return value;
}

// ── One card ─────────────────────────────────────────────────────────────────
export interface OfferRow {
  source: string;
  market: string;
  priceCents: number;
  currency: string;
  url: string;
  inStock: boolean;
  condition: string | null;
  updatedAt: string;
}

export interface CardDetail {
  id: number;
  slug: string;
  name: string;
  tcgName: string;
  number: string | null;
  rarity: string | null;
  variant: string | null;
  printing: string;
  colors: string[];
  cardType: string | null;
  cost: number | null;
  power: number | null;
  counter: number | null;
  life: number | null;
  attribute: string | null;
  subtypes: string[];
  effect: string | null;
  finish: string | null;
  hasImage: boolean;
  tcgplayerUrl: string;
  marketUsd: number | null;
  change7d: number | null;
  change30d: number | null;
  set: SetLite;
  offers: OfferRow[];
  history: { day: string; marketUsd: number | null; lowUsd: number | null }[];
}

// An offer not refreshed for 72 hours (its store failed to read since) is shown
// as sold out rather than as a live price — the same rule the aggregates use.
const STALE_MS = 72 * 3600 * 1000;
function freshOffer(o: { source: string; market: string; priceCents: number; currency: string; url: string; inStock: boolean; condition: string | null; updatedAt: Date }): OfferRow {
  return { ...o, inStock: o.inStock && Date.now() - o.updatedAt.getTime() < STALE_MS, updatedAt: o.updatedAt.toISOString() };
}

export const getCardDetail = unstable_cache(
  async (slug: string): Promise<CardDetail | null> => {
    const c = await prisma.card.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, tcgName: true, number: true, rarity: true, variant: true, printing: true, colors: true,
        cardType: true, cost: true, power: true, counter: true, life: true, attribute: true, subtypes: true, effect: true,
        finish: true, hasImage: true, tcgplayerUrl: true, marketUsd: true, change7d: true, change30d: true,
        set: { select: { id: true, slug: true, code: true, name: true, kind: true, releasedOn: true, cardCount: true, sealedCount: true } },
      },
    });
    if (!c) return null;
    const [offers, history] = await Promise.all([
      prisma.offer.findMany({
        where: { productId: c.id },
        select: { source: true, market: true, priceCents: true, currency: true, url: true, inStock: true, condition: true, updatedAt: true },
        orderBy: { priceCents: "asc" },
      }),
      prisma.priceDay.findMany({
        where: { productId: c.id, day: { gte: new Date(Date.now() - 365 * 864e5) } },
        select: { day: true, marketUsd: true, lowUsd: true },
        orderBy: { day: "asc" },
      }),
    ]);
    return {
      ...c,
      set: { ...c.set, releasedOn: c.set.releasedOn ? c.set.releasedOn.toISOString().slice(0, 10) : null },
      offers: offers.map(freshOffer),
      history: history.map((h) => ({ day: h.day.toISOString().slice(0, 10), marketUsd: h.marketUsd, lowUsd: h.lowUsd })),
    };
  },
  ["card-detail-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

// ── Sealed ───────────────────────────────────────────────────────────────────
export interface SealedLite {
  id: number;
  slug: string;
  name: string;
  setId: number | null;
  kind: string;
  packCount: number | null;
  imageUrl: string | null;
  releasedOn: string | null;
  presale: boolean;
  marketUsd: number | null;
  low: Record<Country, number | null>;
  stores: Record<Country, number>;
  change7d: number | null;
  tcgplayerUrl: string;
}

export const getSealedCatalog = unstable_cache(
  async (): Promise<SealedLite[]> => {
    const rows = await prisma.sealed.findMany({
      select: {
        id: true, slug: true, name: true, setId: true, kind: true, packCount: true, imageUrl: true, releasedOn: true, presale: true,
        marketUsd: true, change7d: true, tcgplayerUrl: true,
        lowUS: true, lowAU: true, lowUK: true, lowSG: true, lowCA: true, lowEU: true,
        storesUS: true, storesAU: true, storesUK: true, storesSG: true, storesCA: true, storesEU: true,
      },
    });
    return rows.map((r) => ({
      id: r.id, slug: r.slug, name: r.name, setId: r.setId, kind: r.kind, packCount: r.packCount, imageUrl: r.imageUrl,
      releasedOn: r.releasedOn ? r.releasedOn.toISOString().slice(0, 10) : null, presale: r.presale, marketUsd: r.marketUsd,
      change7d: r.change7d, tcgplayerUrl: r.tcgplayerUrl,
      low: { US: r.lowUS, AU: r.lowAU, UK: r.lowUK, SG: r.lowSG, CA: r.lowCA, EU: r.lowEU },
      stores: { US: r.storesUS, AU: r.storesAU, UK: r.storesUK, SG: r.storesSG, CA: r.storesCA, EU: r.storesEU },
    }));
  },
  ["sealed-catalog-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export interface SealedDetail extends SealedLite {
  offers: OfferRow[];
  history: { day: string; marketUsd: number | null; lowUsd: number | null }[];
}

export const getSealedDetail = unstable_cache(
  async (slug: string): Promise<Omit<SealedDetail, "low" | "stores"> | null> => {
    const s = await prisma.sealed.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, setId: true, kind: true, packCount: true, imageUrl: true, releasedOn: true, presale: true,
        marketUsd: true, change7d: true, tcgplayerUrl: true,
      },
    });
    if (!s) return null;
    const [offers, history] = await Promise.all([
      prisma.offer.findMany({
        where: { productId: s.id },
        select: { source: true, market: true, priceCents: true, currency: true, url: true, inStock: true, condition: true, updatedAt: true },
        orderBy: { priceCents: "asc" },
      }),
      prisma.priceDay.findMany({
        where: { productId: s.id, day: { gte: new Date(Date.now() - 365 * 864e5) } },
        select: { day: true, marketUsd: true, lowUsd: true },
        orderBy: { day: "asc" },
      }),
    ]);
    return {
      ...s,
      releasedOn: s.releasedOn ? s.releasedOn.toISOString().slice(0, 10) : null,
      offers: offers.map(freshOffer),
      history: history.map((h) => ({ day: h.day.toISOString().slice(0, 10), marketUsd: h.marketUsd, lowUsd: h.lowUsd })),
    };
  },
  ["sealed-detail-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

// ── Site stats, the index, the stores ────────────────────────────────────────
export interface SiteStats {
  lastImportAt: string | null;
  storeOffers: { source: string; market: string; offers: number; inStock: number }[];
}

export const getSiteStats = unstable_cache(
  async (): Promise<SiteStats> => {
    const [run, groups] = await Promise.all([
      prisma.importRun.findFirst({ where: { ok: true }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
      prisma.offer.groupBy({ by: ["source", "market", "inStock"], _count: { _all: true } }),
    ]);
    const map = new Map<string, { source: string; market: string; offers: number; inStock: number }>();
    for (const g of groups) {
      const k = `${g.source}|${g.market}`;
      const row = map.get(k) ?? { source: g.source, market: g.market, offers: 0, inStock: 0 };
      row.offers += g._count._all;
      if (g.inStock) row.inStock += g._count._all;
      map.set(k, row);
    }
    return { lastImportAt: run?.finishedAt?.toISOString() ?? null, storeOffers: [...map.values()] };
  },
  ["site-stats-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export interface IndexPoint {
  day: string;
  value: number;
  totalUsd: number;
  cardCount: number;
}

export const getIndexSeries = unstable_cache(
  async (): Promise<IndexPoint[]> => {
    const rows = await prisma.indexDay.findMany({ orderBy: { day: "asc" }, take: 730 });
    return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), value: r.value, totalUsd: r.totalUsd, cardCount: r.cardCount }));
  },
  ["index-series-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);
