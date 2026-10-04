// The self-cached loaders every page reads through (egress rules: lib/db.ts).
// Each is an unstable_cache tagged "prices" (purged by the import's POST
// /api/revalidate), with a 6h TTL as the backstop. Never wrap these in another
// unstable_cache and never call one inside an unstable_cache callback.
import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { bucketOf, chartSeries, dayNum, type BucketFile, type IndexFile } from "./history";
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
  shippingCents: number | null; // eBay only: first shipping option; null = unknown (postage at checkout)
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
}

export interface HistoryPoint {
  day: string;
  marketUsd: number | null;
  lowUsd: number | null;
}

// An offer not refreshed for 72 hours (its store failed to read since) is shown
// as sold out rather than as a live price — the same rule the aggregates use.
// A stale eBay row is DROPPED instead: an eBay "sold out" means nothing.
const STALE_MS = 72 * 3600 * 1000;
type OfferDbRow = { source: string; market: string; priceCents: number; currency: string; url: string; inStock: boolean; condition: string | null; shippingCents: number | null; updatedAt: Date };
function freshOffer(o: OfferDbRow): OfferRow {
  return { ...o, inStock: o.inStock && Date.now() - o.updatedAt.getTime() < STALE_MS, updatedAt: o.updatedAt.toISOString() };
}
function freshOffers(rows: OfferDbRow[]): OfferRow[] {
  return rows.map(freshOffer).filter((o) => o.inStock || !o.source.startsWith("ebay"));
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
    const offers = await prisma.offer.findMany({
      where: { productId: c.id },
      select: { source: true, market: true, priceCents: true, currency: true, url: true, inStock: true, condition: true, shippingCents: true, updatedAt: true },
      orderBy: { priceCents: "asc" },
    });
    return {
      ...c,
      set: { ...c.set, releasedOn: c.set.releasedOn ? c.set.releasedOn.toISOString().slice(0, 10) : null },
      offers: freshOffers(offers),
    };
  },
  ["card-detail-v3"],
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
    const offers = await prisma.offer.findMany({
      where: { productId: s.id },
      select: { source: true, market: true, priceCents: true, currency: true, url: true, inStock: true, condition: true, shippingCents: true, updatedAt: true },
      orderBy: { priceCents: "asc" },
    });
    return {
      ...s,
      releasedOn: s.releasedOn ? s.releasedOn.toISOString().slice(0, 10) : null,
      offers: freshOffers(offers),
    };
  },
  ["sealed-detail-v3"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

// ── Site stats, the index, the stores ────────────────────────────────────────
export interface SiteStats {
  lastImportAt: string | null;
  storeOffers: { source: string; market: string; offers: number; inStock: number }[];
  /**
   * The eBay pass has run successfully in the last EBAY_LIVE_DAYS. Copy that
   * says we collect eBay prices is shown only then; with no eBay secrets the
   * site reads exactly as it did before the eBay API.
   */
  ebayLive: boolean;
}

const EBAY_LIVE_DAYS = 3;

export const getSiteStats = unstable_cache(
  async (): Promise<SiteStats> => {
    const [run, groups, ebayRun] = await Promise.all([
      prisma.importRun.findFirst({ where: { ok: true, kind: { not: "ebay" } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
      // eBay is not a store: never in store counts or homepage stats.
      prisma.offer.groupBy({ by: ["source", "market", "inStock"], where: { NOT: { source: { startsWith: "ebay" } } }, _count: { _all: true } }),
      prisma.importRun.findFirst({
        where: { kind: "ebay", ok: true, finishedAt: { gte: new Date(Date.now() - EBAY_LIVE_DAYS * 86_400_000) } },
        select: { id: true },
      }),
    ]);
    const map = new Map<string, { source: string; market: string; offers: number; inStock: number }>();
    for (const g of groups) {
      const k = `${g.source}|${g.market}`;
      const row = map.get(k) ?? { source: g.source, market: g.market, offers: 0, inStock: 0 };
      row.offers += g._count._all;
      if (g.inStock) row.inStock += g._count._all;
      map.set(k, row);
    }
    return { lastImportAt: run?.finishedAt?.toISOString() ?? null, storeOffers: [...map.values()], ebayLive: Boolean(ebayRun) };
  },
  ["site-stats-v3"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export interface IndexPoint {
  day: string;
  value: number;
  totalUsd: number;
  cardCount: number;
}

/** The OP Compare Index: the NEWEST two years, oldest first for the chart. */
export async function getIndexSeries(): Promise<IndexPoint[]> {
  const f = await historyFile<IndexFile>("index.json");
  return (f?.days ?? []).slice(-730);
}

// ── Price history (GitHub) ───────────────────────────────────────────────────
// History is not in Postgres: the import commits it to the `data` branch of the
// public repo (lib/history.ts), and pages read it from GitHub's raw CDN, pinned
// to the commit the import last published (Meta "historyRef"). A pinned URL
// never changes, so Next's fetch cache keeps each file for a month and the
// database is asked only for the 40-byte ref. Falls back to the branch name
// before the first publish; HISTORY_LOCAL_DIR reads a local checkout (dev).
const HISTORY_RAW = (process.env.HISTORY_RAW_BASE || "https://raw.githubusercontent.com/Specifxx/OpCompare").replace(/\/+$/, "");

export const getHistoryRef = unstable_cache(
  async (): Promise<string | null> => (await prisma.meta.findUnique({ where: { key: "historyRef" }, select: { value: true } }))?.value ?? null,
  ["history-ref-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

async function historyFile<T>(rel: string): Promise<T | null> {
  const local = process.env.HISTORY_LOCAL_DIR;
  if (local) {
    try {
      return JSON.parse(await fs.readFile(path.join(local, rel), "utf8")) as T;
    } catch {
      return null;
    }
  }
  try {
    const ref = (await getHistoryRef()) ?? "data";
    const r = await fetch(`${HISTORY_RAW}/${ref}/history/${rel}`, { next: { revalidate: ref === "data" ? 3600 : 30 * 86400 } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** One card's or sealed product's last year of prices, for its chart. */
export async function getProductHistory(id: number): Promise<HistoryPoint[]> {
  const f = await historyFile<BucketFile>(`products/${bucketOf(id)}.json`);
  return chartSeries(f?.p[String(id)], dayNum(new Date().toISOString()), 365);
}

// ---- deals track loaders ----
import { ebaySourceFor, encodeDealInput, type DealInputTuple, type EbayListingRow, type StoreListing as DealStoreListing } from "./deals";
// Deal Finder, the homepage's Today's Top Deals, /market/records and the
// Premium proof line all rank from these (pure rules in lib/deals.ts). Same
// freshness rule as aggregate() in lib/import.ts: in stock and refreshed in the
// last 72 hours. Cards only.
const DEAL_FRESH_HOURS = STALE_MS / 3_600_000;

/**
 * One compact tuple per card with any fresh listing in `country`:
 * [id, cheapest store price, TCGplayer's own lowest listing (US), cheapest eBay
 * listing (item + stated postage, or the item price alone), postage known].
 * One query per market, reduced in Postgres; ~7k rows ≈ 200 KB.
 */
export const getDealInputs = unstable_cache(
  async (country: Country): Promise<DealInputTuple[]> => {
    const ebaySource = ebaySourceFor(country) ?? "";
    const rows = await prisma.$queryRaw<{ id: number; storeMin: number | null; tcgLow: number | null; ebayCents: number | null; ebayKnown: boolean | null }[]>`
      WITH fresh AS (
        SELECT o."productId" AS id, o.source, o."priceCents" AS p, o."shippingCents" AS s
        FROM "Offer" o JOIN "Card" c ON c.id = o."productId"
        WHERE o.market = ${country} AND o."inStock" AND o."updatedAt" > now() - make_interval(hours => ${DEAL_FRESH_HOURS}::int)
      ), st AS (
        SELECT id, MIN(p) AS m FROM fresh WHERE source LIKE 'store:%' GROUP BY id
      ), tc AS (
        SELECT id, MIN(p) AS m FROM fresh WHERE source = 'tcgplayer' GROUP BY id
      ), eb AS (
        SELECT DISTINCT ON (id) id, p + COALESCE(s, 0) AS m, (s IS NOT NULL) AS k
        FROM fresh WHERE source = ${ebaySource}
        ORDER BY id, p + COALESCE(s, 0) ASC, (s IS NULL) ASC
      ), ids AS (
        SELECT id FROM st UNION SELECT id FROM tc UNION SELECT id FROM eb
      )
      SELECT ids.id, st.m AS "storeMin", tc.m AS "tcgLow", eb.m AS "ebayCents", eb.k AS "ebayKnown"
      FROM ids LEFT JOIN st ON st.id = ids.id LEFT JOIN tc ON tc.id = ids.id LEFT JOIN eb ON eb.id = ids.id
      ORDER BY ids.id
    `;
    return rows.map((r) => encodeDealInput({ id: Number(r.id), storeMin: num(r.storeMin), tcgLow: num(r.tcgLow), ebayCents: num(r.ebayCents), ebayKnown: r.ebayKnown }, country));
  },
  ["deal-inputs-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

/**
 * The cheapest fresh in-stock price per card across SOME stores (the Deal
 * Finder's store picker, Plus only): [id, min][]. Keyed by the sorted store
 * list, like RiftCompare's minByCard. ~7k pairs ≈ 100 KB.
 */
export const getStoreMins = unstable_cache(
  async (country: Country, storeKeys: string[]): Promise<[number, number][]> => {
    const sources = [...new Set(storeKeys)].sort().map((k) => `store:${k}`);
    if (!sources.length) return [];
    const rows = await prisma.$queryRaw<{ id: number; m: number }[]>`
      SELECT o."productId" AS id, MIN(o."priceCents") AS m
      FROM "Offer" o JOIN "Card" c ON c.id = o."productId"
      WHERE o.market = ${country} AND o."inStock" AND o."updatedAt" > now() - make_interval(hours => ${DEAL_FRESH_HOURS}::int)
        AND o.source = ANY(${sources})
      GROUP BY o."productId"
    `;
    return rows.map((r) => [Number(r.id), Number(r.m)]);
  },
  ["deal-store-mins-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export interface DealOfferDetail {
  id: number;
  stores: DealStoreListing[]; // every fresh in-stock store listing in the market
  ebay: EbayListingRow[]; // the market's eBay singles row(s)
  tcgplayerUrl: string;
}

/**
 * The live listings behind one page of deals (≤ 25 cards): every fresh store
 * listing (source, price, url, condition), the eBay row and the card's TCGplayer
 * URL. Bounded both ways; the page re-scores each row with these prices.
 */
export const getDealOffers = unstable_cache(
  async (country: Country, ids: number[]): Promise<DealOfferDetail[]> => {
    const want = [...new Set(ids.filter((n) => Number.isInteger(n)))].slice(0, 25);
    if (!want.length) return [];
    const ebaySource = ebaySourceFor(country);
    const [offers, cards] = await Promise.all([
      prisma.offer.findMany({
        where: {
          market: country,
          productId: { in: want },
          inStock: true,
          updatedAt: { gt: new Date(Date.now() - STALE_MS) },
          OR: [{ source: { startsWith: "store:" } }, ...(ebaySource ? [{ source: ebaySource }] : [])],
        },
        select: { productId: true, source: true, priceCents: true, shippingCents: true, url: true, condition: true },
        // Cheapest first, so if the cap ever bites it drops the dearest listings, never a row's own.
        orderBy: { priceCents: "asc" },
        take: want.length * 80,
      }),
      prisma.card.findMany({ where: { id: { in: want } }, select: { id: true, tcgplayerUrl: true }, take: want.length }),
    ]);
    return cards.map((c) => ({
      id: c.id,
      tcgplayerUrl: c.tcgplayerUrl,
      stores: offers
        .filter((o) => o.productId === c.id && o.source.startsWith("store:"))
        .map((o) => ({ source: o.source, priceCents: o.priceCents, url: o.url, condition: o.condition })),
      ebay: offers
        .filter((o) => o.productId === c.id && o.source === ebaySource)
        .map((o) => ({ id: o.productId, priceCents: o.priceCents, shippingCents: o.shippingCents, url: o.url })),
    }));
  },
  ["deal-offers-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

// ---- tools track loaders ----
// The deck pricer, keyword and Leader pages, and per-store pages. Each is one
// self-cached read like every loader above; pages combine them with
// getCatalog() OUTSIDE any cache callback.

/**
 * Card types (subtypes: "Straw Hat Crew") and printed keywords, per card
 * NUMBER — every printing of a number carries the same text, so one row per
 * number is read (DISTINCT ON), and the effect text itself never leaves this
 * function: only lib/keywords.ts's slugs are cached. Dictionary-encoded, a few
 * tens of KB.
 */
export interface CardTextIndex {
  types: string[];
  kws: string[];
  rows: [number: string, typeIdx: number[], kwIdx: number[]][];
}

export const getCardText = unstable_cache(
  async (): Promise<CardTextIndex> => {
    const { cardKeywords } = await import("./keywords");
    const rows = await prisma.$queryRaw<{ number: string; subtypes: string[]; effect: string | null }[]>`
      SELECT DISTINCT ON (number) number, subtypes, effect FROM "Card"
      WHERE number IS NOT NULL AND printing <> 'don'
      ORDER BY number, (printing = 'standard') DESC, id`;
    const types: string[] = [];
    const kws: string[] = [];
    const ti = new Map<string, number>();
    const ki = new Map<string, number>();
    const at = (m: Map<string, number>, list: string[], v: string) => m.get(v) ?? (list.push(v), m.set(v, list.length - 1).get(v)!);
    return {
      types,
      kws,
      rows: rows
        .map((r): CardTextIndex["rows"][number] => [r.number, r.subtypes.map((t) => at(ti, types, t)), cardKeywords(r.effect).map((k) => at(ki, kws, k))])
        .filter((r) => r[1].length || r[2].length),
    };
  },
  ["card-text-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

/** Decoded getCardText(): number → { types, keywords }. */
export async function getCardTextByNumber(): Promise<Map<string, { types: string[]; keywords: string[] }>> {
  const t = await getCardText();
  return new Map(t.rows.map(([n, ts, ks]) => [n, { types: ts.map((i) => t.types[i]), keywords: ks.map((i) => t.kws[i]) }]));
}

/** One store's footprint in one market, for /stores/[slug]. Stale rows (72 h) are not in stock. */
export interface StoreStat {
  source: string;
  market: string;
  offers: number;
  inStock: number;
  singlesInStock: number;
  sealedInStock: number;
  /** In-stock products where this store's price IS the market's cheapest listing. */
  cheapest: number;
}

export const getStoreStats = unstable_cache(
  async (): Promise<StoreStat[]> => {
    const rows = await prisma.$queryRaw<StoreStat[]>`
      WITH o AS (
        SELECT o.source, o.market, o."priceCents", c.id AS card_id, s.id AS sealed_id,
          (o."inStock" AND o."updatedAt" > now() - interval '72 hours') AS live,
          CASE o.market
            WHEN 'US' THEN COALESCE(c."lowUS", s."lowUS") WHEN 'AU' THEN COALESCE(c."lowAU", s."lowAU")
            WHEN 'UK' THEN COALESCE(c."lowUK", s."lowUK") WHEN 'SG' THEN COALESCE(c."lowSG", s."lowSG")
            WHEN 'CA' THEN COALESCE(c."lowCA", s."lowCA") WHEN 'EU' THEN COALESCE(c."lowEU", s."lowEU") END AS low
        FROM "Offer" o
        LEFT JOIN "Card" c ON c.id = o."productId"
        LEFT JOIN "Sealed" s ON s.id = o."productId"
        WHERE o.source LIKE 'store:%'
      )
      SELECT source, market,
        count(*)::int AS offers,
        count(*) FILTER (WHERE live)::int AS "inStock",
        count(*) FILTER (WHERE live AND card_id IS NOT NULL)::int AS "singlesInStock",
        count(*) FILTER (WHERE live AND sealed_id IS NOT NULL)::int AS "sealedInStock",
        count(*) FILTER (WHERE live AND "priceCents" = low)::int AS cheapest
      FROM o GROUP BY source, market`;
    return rows;
  },
  ["store-stats-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

/**
 * One store's showcase: its most expensive in-stock singles, and the most
 * valuable products (by TCGplayer market) where it is the cheapest listing in
 * its market. Tuples, 24 of each; the page names them from getCatalog().
 */
export type StoreListing = [productId: number, priceCents: number, condition: string | null, url: string];
export interface StoreListings {
  top: StoreListing[];
  cheapestHere: StoreListing[];
}

export const getStoreListings = unstable_cache(
  async (source: string, market: string): Promise<StoreListings> => {
    // `market` is spliced into a column name below: only the six markets pass.
    if (!(MARKETS as string[]).includes(market) || !source.startsWith("store:")) return { top: [], cheapestHere: [] };
    const live = (q: { "inStock": boolean; updatedAt: Date }) => q.inStock && Date.now() - q.updatedAt.getTime() < STALE_MS;
    const [top, cheap] = await Promise.all([
      prisma.offer.findMany({
        where: { source, market, inStock: true, updatedAt: { gte: new Date(Date.now() - STALE_MS) } },
        orderBy: { priceCents: "desc" },
        take: 24,
        select: { productId: true, priceCents: true, condition: true, url: true, inStock: true, updatedAt: true },
      }),
      prisma.$queryRawUnsafe<{ productId: number; priceCents: number; condition: string | null; url: string }[]>(
        `SELECT o."productId", o."priceCents", o.condition, o.url FROM "Offer" o JOIN "Card" c ON c.id = o."productId"
         WHERE o.source = $1 AND o.market = $2 AND o."inStock" AND o."updatedAt" > now() - interval '72 hours'
           AND o."priceCents" = c."low${market}" AND c."marketUsd" IS NOT NULL
         ORDER BY c."marketUsd" DESC LIMIT 24`,
        source,
        market,
      ),
    ]);
    return {
      top: top.filter(live).map((r): StoreListing => [r.productId, r.priceCents, r.condition, r.url]),
      cheapestHere: cheap.map((r): StoreListing => [r.productId, r.priceCents, r.condition, r.url]),
    };
  },
  ["store-listings-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

// ---- ux track loaders ----
// Sparklines for mover and watchlist rows: the last `days` of each card's
// TCGplayer market price, downsampled to at most 30 points. Reads the same
// history bucket files as getProductHistory (GitHub raw, pinned and fetch-
// cached for a month), one file per distinct bucket, never the database. Not
// an unstable_cache: the fetch cache already holds every file. Capped at 48
// ids per call so a long list cannot fan out into every bucket.
export async function getSparklines(ids: number[], days = 30): Promise<Record<number, number[]>> {
  const want = [...new Set(ids)].slice(0, 48);
  const buckets = [...new Set(want.map(bucketOf))];
  const files = await Promise.all(buckets.map((b) => historyFile<BucketFile>(`products/${b}.json`)));
  const byBucket = new Map(buckets.map((b, i) => [b, files[i]]));
  const today = dayNum(new Date().toISOString());
  const out: Record<number, number[]> = {};
  for (const id of want) {
    const series = chartSeries(byBucket.get(bucketOf(id))?.p[String(id)], today, days)
      .map((p) => p.marketUsd)
      .filter((v): v is number => v != null);
    if (series.length >= 2) out[id] = series.length <= 30 ? series : Array.from({ length: 30 }, (_, i) => series[Math.round((i * (series.length - 1)) / 29)]);
  }
  return out;
}

// ── wave2:foundation ──
// EMAIL STATUS. Every send is script-side (GitHub Actions) and happens only
// when RESEND_API_KEY and EMAIL_FROM are both set there (isEmailEnabled()); the
// site never holds those secrets, so the alert workflow records what it found
// in Meta key "email" ("on" | "off"). Pages decide what to promise from this:
// while it is "off", no copy promises email and no email field renders, and
// alerts arrive as in-app notifications. Cached like getHistoryRef (tag
// "prices", same TTL): one 1-row read per TTL, never per request. A missing
// key, any other value or a read error is "off" — the safe answer is never to
// promise an email nobody will send. The error is caught OUTSIDE the cache so
// a transient failure is not stored for a whole TTL.
export type EmailStatus = "on" | "off";

const getEmailMeta = unstable_cache(
  async (): Promise<string | null> => (await prisma.meta.findUnique({ where: { key: "email" }, select: { value: true } }))?.value ?? null,
  ["email-status-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export function emailStatusFrom(value: string | null | undefined): EmailStatus {
  return value?.trim().toLowerCase() === "on" ? "on" : "off";
}

export async function getEmailStatus(): Promise<EmailStatus> {
  try {
    return emailStatusFrom(await getEmailMeta());
  } catch {
    return "off";
  }
}
// ── end wave2:foundation ──

// ── wave2:tools ──
// Best Basket, Box EV, Demand Finder, Rising Cards and the deck library read
// through these. Same rules as every loader above: one self-cached read each,
// tagged "prices", combined with getCatalog() OUTSIDE any cache callback.

/**
 * BEST BASKET'S LISTINGS: every fresh (72 h) in-stock store listing — and in
 * the US TCGplayer's own cheapest listing — for these cards in one market.
 * eBay is never in a basket (CLAUDE.md), so it is not even read. OP Compare
 * keeps ONE row per (product, source, market), the store's best-condition copy
 * (lib/import.ts), so the member's minimum condition filters that row
 * (lib/basket-server.ts). Tuples, cheapest first; the caller chunks ids into
 * sorted groups of BASKET_ID_CHUNK, so an entry holds at most ~40 cards × the
 * market's ~75 sources (a few hundred KB at the very worst, well under 2 MB).
 */
export type BasketListingTuple = [productId: number, source: string, priceCents: number, condition: string | null, url: string];
export const BASKET_ID_CHUNK = 40;

export const getBasketListings = unstable_cache(
  async (country: Country, ids: number[]): Promise<BasketListingTuple[]> => {
    const want = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, BASKET_ID_CHUNK);
    if (!want.length) return [];
    const rows = await prisma.offer.findMany({
      where: {
        market: country,
        productId: { in: want },
        inStock: true,
        updatedAt: { gt: new Date(Date.now() - STALE_MS) },
        OR: [{ source: { startsWith: "store:" } }, { source: "tcgplayer" }],
      },
      select: { productId: true, source: true, priceCents: true, condition: true, url: true },
      orderBy: { priceCents: "asc" },
      take: want.length * 120,
    });
    return rows.map((r): BasketListingTuple => [r.productId, r.source, r.priceCents, r.condition, r.url]);
  },
  ["basket-listings-v1"],
  { tags: [PRICES_TAG], revalidate: TTL },
);
// ── The public deck library (lib/published-decks.ts) ──
// Live decks, one compact row each; the page prices them from getCatalog()
// (each card's low<MKT>) outside the cache, so a price import moves every
// total without a deck read. Tagged "published-decks": a publish or a hide
// revalidates it at once. Readers THROW inside the cache (a failed read is
// never stored as an empty library) and pages catch outside it.
export const DECKS_TAG = "published-decks";

export interface LibraryDeckRow {
  id: string;
  slug: string;
  title: string;
  authorName: string | null;
  leaderName: string;
  leaderSlug: string;
  leaderCardId: number;
  colors: string;
  lines: { cardId: number; qty: number }[];
  cardCount: number;
  publishedTotals: Partial<Record<Country, number | null>>;
  createdAt: string;
}

const DECK_ROW_SELECT = {
  id: true, slug: true, title: true, authorName: true, leaderName: true, leaderSlug: true, leaderCardId: true, colors: true,
  lines: true, cardCount: true, publishedTotals: true, createdAt: true,
} as const;

function deckRowOf(d: { id: string; slug: string; title: string; authorName: string | null; leaderName: string; leaderSlug: string; leaderCardId: number; colors: string; lines: unknown; cardCount: number; publishedTotals: unknown; createdAt: Date }): LibraryDeckRow {
  return {
    ...d,
    lines: Array.isArray(d.lines) ? (d.lines as { cardId: number; qty: number }[]) : [],
    publishedTotals: (d.publishedTotals && typeof d.publishedTotals === "object" ? d.publishedTotals : {}) as Partial<Record<Country, number | null>>,
    createdAt: d.createdAt.toISOString(),
  };
}

/** Every live deck, newest first (at most 300 — a few hundred KB at most). */
export const getLibraryDecks = unstable_cache(
  async (): Promise<LibraryDeckRow[]> =>
    (await prisma.publishedDeck.findMany({ where: { status: "live" }, orderBy: { createdAt: "desc" }, take: 300, select: DECK_ROW_SELECT })).map(deckRowOf),
  ["library-decks-v1"],
  { tags: [DECKS_TAG], revalidate: 3600 },
);

/** One live deck by slug, with its description and list text; null when there is none. */
export const getPublishedDeck = unstable_cache(
  async (slug: string): Promise<(LibraryDeckRow & { description: string | null; list: string }) | null> => {
    const d = await prisma.publishedDeck.findFirst({ where: { slug, status: "live" }, select: { ...DECK_ROW_SELECT, description: true, list: true } });
    return d ? { ...deckRowOf(d), description: d.description, list: d.list } : null;
  },
  ["published-deck-v1"],
  { tags: [DECKS_TAG], revalidate: 3600 },
);

/** Up to six live decks that play a card (the card page's "Decks using this card"). */
export const getDecksUsingCard = unstable_cache(
  async (cardId: number): Promise<{ slug: string; title: string; leaderName: string }[]> =>
    prisma.publishedDeck.findMany({
      where: { status: "live", cardIds: { has: cardId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { slug: true, title: true, leaderName: true },
    }),
  ["decks-using-card-v1"],
  { tags: [DECKS_TAG], revalidate: 3600 },
);
// ── end wave2:tools ──
