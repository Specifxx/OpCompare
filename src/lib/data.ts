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
import { SNAPSHOT_FRESH_MS } from "./price-snapshot";
import { decodeLastKnownRow, type LastKnown, type LastKnownFile } from "./last-known";
import {
  snapCardDetail, snapCardsById, snapCardTextRows, snapChaseStrip, snapCore, snapDealInputs, snapEbayPanel, snapEbayPicks, snapOffersOf, snapPrices,
  snapSealedCatalog, snapSealedDetail, snapSiteStats, snapSoldOut, snapStoreListings, snapStorePrices, snapStoreStats,
} from "./price-snapshot-read";

export const PRICES_TAG = "prices";
const TTL = 60 * 60 * 6;
// THE PUBLIC DATA IS NOT IN NEON (owner, 2026-10-14). Every loader of prices,
// catalogue and eBay state below reads the files of the `snapshot` branch on
// GitHub (lib/price-snapshot-read.ts); Neon is asked only for private state
// (the history ref, email status, the popularity counters, reviews, decks, the
// promo counter). Those few reads keep the longer TTL: each refresh is transfer.
const DB_TTL = 60 * 60 * 12;

// ── The catalogue: every printing, compact ───────────────────────────────────
// Two cache entries, both ordered by id: the card FACTS (change only when the
// catalogue does) and the PRICES. Tuples, not objects: as objects the ~7,300
// rows measured 3.7 MB against the Data Cache's ~2 MB item ceiling; split into
// tuples each half is well under 1 MB, with room for years of new sets.
export type CoreTuple = [
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
export type PriceTuple = [
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
  /**
   * DISPLAY ONLY (lib/last-known.ts): in a market where this card has no price,
   * the newest price its published history holds there. Shown muted and labelled
   * in place of "No price yet"; never a price for sorting, filtering, ranking,
   * alerts, baskets, values, JSON-LD, metadata or share images (those read `low`
   * and `marketUsd`). Absent on almost every card.
   */
  lastKnown?: Partial<Record<Country, LastKnown>>;
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

type CoreFile = { cards: CoreTuple[]; sets: SetLite[] };
// `lastKnown`: an additive field (2026-10-18), absent from older snapshots (lib/last-known.ts).
type PricesFile = { ids: number[]; prices: PriceTuple[]; at: string; lastKnown?: LastKnownFile };

async function readCore(): Promise<CoreFile> {
  const c = await snapCore();
  // The sets carry TCGplayer's own group name for the store matcher; no page wants it.
  return { cards: c.cards, sets: c.sets.map(({ tcgName: _t, ...s }: SetLite & { tcgName?: string }) => (void _t, s)) };
}

const loadCore = unstable_cache(readCore, ["catalog-core-v2"], { tags: [PRICES_TAG], revalidate: TTL });

const loadPrices = unstable_cache(
  async (): Promise<PricesFile> => snapPrices(),
  ["catalog-prices-v2"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

const NO_PRICE: PriceTuple = [null, 0, 0, null, null, null];

function decode(t: CoreTuple, p: PriceTuple, setCode: string | undefined, lastKnown?: CardLite["lastKnown"]): CardLite {
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
    ...(lastKnown ? { lastKnown } : {}),
  };
}

// A warm lambda keeps the decoded catalogue for a few minutes, so a burst of
// requests reads the Data Cache once rather than once each.
let memo: { at: number; value: Catalog } | null = null;
let imageMemo: { at: number; value: Catalog } | null = null;
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

/** `withLastKnown`: the pages' catalogue only; the share images never see a last known price. */
function catalogOf(core: CoreFile, pr: PricesFile, withLastKnown: boolean): Catalog {
  const codeOf = new Map(core.sets.map((s) => [s.id, s.code]));
  const priceById = new Map<number, PriceTuple>();
  pr.ids.forEach((id, i) => priceById.set(id, pr.prices[i]));
  const lk = withLastKnown ? pr.lastKnown : undefined;
  const cards = core.cards.map((t) => decode(t, priceById.get(t[0]) ?? NO_PRICE, codeOf.get(t[4]), lk ? decodeLastKnownRow(lk[String(t[0])]) : undefined));
  return {
    cards,
    sets: core.sets,
    setById: new Map(core.sets.map((s) => [s.id, s])),
    setBySlug: new Map(core.sets.map((s) => [s.slug, s])),
    bySlug: new Map(cards.map((c) => [c.slug, c])),
    byId: new Map(cards.map((c) => [c.id, c])),
    pricesAt: pr.at,
  };
}

export async function getCatalog(): Promise<Catalog> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  const [core, pr] = await Promise.all([loadCore(), loadPrices()]);
  const value = catalogOf(core, pr, true);
  memo = { at: Date.now(), value };
  return value;
}

// ── Share images: the same snapshot, held for a day ──────────────────────────
// The share-image routes (src/app/**/opengraph-image.tsx) are ISR for a DAY
// (owner, 2026-10-14: "cache them for a long time, a day or more"). Next keeps
// the LOWEST revalidate that any cached read in a render declares, and a read
// tagged "prices" makes the render purgeable by the import's revalidateTag. So
// an image that read the 6-hour, "prices"-tagged loaders above would live six
// hours and be redrawn after every import, whatever its route exports. These
// are the same snapshot files under their own keys, held a day, untagged: an
// image shows prices up to a day (two at the very worst: this entry's age plus
// the image's) behind the pages. Only lib/og and the blog post context for
// images read them; pages never do (tests/og.test.ts).
export const IMAGE_TTL = 60 * 60 * 24;

const loadCoreForImages = unstable_cache(readCore, ["og-catalog-core-v1"], { revalidate: IMAGE_TTL });
const loadPricesForImages = unstable_cache(async (): Promise<PricesFile> => snapPrices(), ["og-catalog-prices-v1"], { revalidate: IMAGE_TTL });

/** getCatalog() for the share images: a day old at most (see above). */
export async function getCatalogForImages(): Promise<Catalog> {
  if (imageMemo && Date.now() - imageMemo.at < MEMO_MS) return imageMemo.value;
  const [core, pr] = await Promise.all([loadCoreForImages(), loadPricesForImages()]);
  const value = catalogOf(core, pr, false);
  imageMemo = { at: Date.now(), value };
  return value;
}

/** getSealedCatalog() for the share images. */
export const getSealedCatalogForImages = unstable_cache(async (): Promise<SealedLite[]> => snapSealedCatalog(), ["og-sealed-catalog-v1"], { revalidate: IMAGE_TTL });

/** getSiteStats() for the share images. */
export const getSiteStatsForImages = unstable_cache(async (): Promise<SiteStats> => snapSiteStats(), ["og-site-stats-v1"], { revalidate: IMAGE_TTL });

/**
 * Cut the ISR life of the render in progress to `seconds` (a share image that
 * drew its fallback after a read error or for a slug the data does not have
 * yet: it must not be pinned for a day). Next keeps the lowest revalidate any
 * cached read in a render declares, so reading this constant entry, declared
 * with `seconds`, is how a render shortens its own life; it reads nothing (no
 * database, no network). Outside a Next render (tests, scripts) it does nothing.
 */
const shortLived = new Map<number, () => Promise<number>>();
export async function expireRenderAfter(seconds: number): Promise<void> {
  let marker = shortLived.get(seconds);
  if (!marker) {
    marker = unstable_cache(async () => seconds, [`short-lived-render-v1-${seconds}`], { revalidate: seconds });
    shortLived.set(seconds, marker);
  }
  await marker().catch(() => undefined);
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
  /** Every market's low in MARKETS order and its own currency (v1 history: US only). */
  lows?: (number | null)[];
}

// An offer not refreshed for 72 hours (its store failed to read since) is shown
// as sold out rather than as a live price — the same rule the aggregates use.
// A stale eBay row is DROPPED instead: an eBay "sold out" means nothing.
const STALE_MS = 72 * 3600 * 1000;
export const getCardDetail = unstable_cache(
  async (slug: string): Promise<CardDetail | null> => snapCardDetail(slug),
  ["card-detail-v4"],
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
  async (): Promise<SealedLite[]> => snapSealedCatalog(),
  ["sealed-catalog-v2"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export interface SealedDetail extends SealedLite {
  offers: OfferRow[];
}

export const getSealedDetail = unstable_cache(
  async (slug: string): Promise<Omit<SealedDetail, "low" | "stores"> | null> => snapSealedDetail(slug),
  ["sealed-detail-v4"],
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
  async (): Promise<SiteStats> => snapSiteStats(),
  ["site-stats-v4"],
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

/** getIndexSeries() for the share images (the history ref held a day, untagged: see getCatalogForImages). */
export async function getIndexSeriesForImages(): Promise<IndexPoint[]> {
  const f = await historyFile<IndexFile>("index.json", getHistoryRefForImages);
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

// A database failure is not "no ref": the charts then read the branch itself (historyFile's "data" fallback).
const readHistoryRef = async (): Promise<string | null> =>
  prisma.meta.findUnique({ where: { key: "historyRef" }, select: { value: true } }).then((m) => m?.value ?? null, () => null);

export const getHistoryRef = unstable_cache(readHistoryRef, ["history-ref-v1"], { tags: [PRICES_TAG], revalidate: DB_TTL });
const getHistoryRefForImages = unstable_cache(readHistoryRef, ["og-history-ref-v1"], { revalidate: IMAGE_TTL });

async function historyFile<T>(rel: string, refOf: () => Promise<string | null> = getHistoryRef): Promise<T | null> {
  const local = process.env.HISTORY_LOCAL_DIR;
  if (local) {
    try {
      return JSON.parse(await fs.readFile(path.join(local, rel), "utf8")) as T;
    } catch {
      return null;
    }
  }
  try {
    const ref = (await refOf()) ?? "data";
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
  async (country: Country): Promise<DealInputTuple[]> => snapDealInputs(country),
  ["deal-inputs-v2"],
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
    const file = await snapStorePrices(country);
    const min = new Map<number, number>();
    for (const source of sources) {
      const flat = file[source] ?? [];
      for (let i = 0; i < flat.length; i += 2) {
        const prev = min.get(flat[i]);
        if (prev == null || flat[i + 1] < prev) min.set(flat[i], flat[i + 1]);
      }
    }
    return [...min];
  },
  ["deal-store-mins-v2"],
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
    const [offers, cards] = await Promise.all([snapOffersOf(want), snapCardsById()]);
    const live = (o: OfferRow) => o.market === country && o.inStock && Date.now() - Date.parse(o.updatedAt) < STALE_MS;
    return want.flatMap((id): DealOfferDetail[] => {
      const card = cards.get(id);
      if (!card) return [];
      const rows = (offers.get(id) ?? []).filter(live).sort((a, b) => a.priceCents - b.priceCents);
      return [
        {
          id,
          tcgplayerUrl: card.tcgplayerUrl,
          stores: rows.filter((o) => o.source.startsWith("store:")).slice(0, 80).map((o) => ({ source: o.source, priceCents: o.priceCents, url: o.url, condition: o.condition })),
          ebay: rows.filter((o) => o.source === ebaySource).map((o) => ({ id, priceCents: o.priceCents, shippingCents: o.shippingCents, url: o.url })),
        },
      ];
    });
  },
  ["deal-offers-v2"],
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
    const rows = await snapCardTextRows();
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
  ["card-text-v2"],
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
  async (): Promise<StoreStat[]> => snapStoreStats(),
  ["store-stats-v2"],
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
    // Only the six markets and real stores have a file.
    if (!(MARKETS as string[]).includes(market) || !source.startsWith("store:")) return { top: [], cheapestHere: [] };
    return snapStoreListings(market as Country, source);
  },
  ["store-listings-v2"],
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
// when both mail secrets are set there (isEmailEnabled()); the
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
  { tags: [PRICES_TAG], revalidate: DB_TTL },
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
// ── wave2:design ──
// The homepage and region homes. Composed from the cached loaders above — no
// new cache wraps a loader (CLAUDE.md, "Egress"); the only new queries are the
// popularity read (one select-limited findMany, cached) and the approved
// reviews (cached). Pure rules live in lib/home.ts.
import { homeStatsFrom, popularKind, recentMoves, type HomeStats, type PopularKind, type RecentMove } from "./home";
import { mostValuable, newestBoosterSet } from "./selectors";
import type { DayFile } from "./history";

/** Per-market hero stats: cards, stores (store:* + TCGplayer in the US, never eBay), freshness. */
export async function getHomeStats(): Promise<HomeStats> {
  const [cat, stats] = await Promise.all([getCatalog(), getSiteStats()]);
  const priced = Object.fromEntries(MARKETS.map((m) => [m, 0])) as Record<Country, number>;
  for (const c of cat.cards) for (const m of MARKETS) if (c.low[m] != null) priced[m]++;
  return homeStatsFrom(stats.storeOffers, priced, cat.cards.length, stats.lastImportAt);
}

const loadSearched = unstable_cache(
  async (): Promise<number[]> => {
    // The counters are private (Neon, CardDemand); a tie on searches goes to the dearer card, then the more viewed.
    const rows = await prisma.cardDemand.findMany({ where: { searchCount: { gt: 0 } }, orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }], take: 200, select: { cardId: true, searchCount: true, viewCount: true } });
    const cards = await snapCardsById();
    return rows
      .sort((a, b) => b.searchCount - a.searchCount || (cards.get(b.cardId)?.marketUsd ?? -1) - (cards.get(a.cardId)?.marketUsd ?? -1) || b.viewCount - a.viewCount)
      .slice(0, 24)
      .map((r) => r.cardId);
  },
  ["home-searched-v2"],
  { tags: [PRICES_TAG], revalidate: DB_TTL },
);

/**
 * The "Most popular" row: the most-searched cards once Card.searchCount has
 * data, else the newest booster set's most valuable printings ("chase").
 */
export async function getPopular(n = 12): Promise<{ kind: PopularKind; cards: CardLite[] }> {
  const cat = await getCatalog();
  let searched: number[] = [];
  try {
    searched = await loadSearched();
  } catch {
    /* the counter is a nicety: fall back to the chase row */
  }
  if (popularKind(searched) === "popular") {
    return { kind: "popular", cards: searched.map((id) => cat.byId.get(id)).filter((c): c is CardLite => !!c).slice(0, n) };
  }
  const newest = newestBoosterSet(cat.sets);
  return { kind: "chase", cards: newest ? mostValuable(cat.cards, n, (x) => x.setId === newest.id) : mostValuable(cat.cards, n) };
}

/** Cards whose price changed between the two newest daily history files (lib/home.ts recentMoves). */
export async function getRecentlyUpdated(n = 24): Promise<{ card: CardLite; pct: number }[]> {
  try {
    const days = (await getIndexSeries()).map((d) => d.day);
    if (days.length < 2) return [];
    const [a, b] = days.slice(-2);
    const [prev, last, cat] = await Promise.all([historyFile<DayFile>(`days/${a}.json`), historyFile<DayFile>(`days/${b}.json`), getCatalog()]);
    if (!prev || !last) return [];
    return recentMoves(prev.p, last.p, (id) => cat.byId.has(id), n).flatMap((m: RecentMove) => {
      const card = cat.byId.get(m.id);
      return card ? [{ card, pct: m.pct }] : [];
    });
  } catch {
    return [];
  }
}

export interface PublicReview {
  id: string;
  rating: number | null;
  message: string;
  displayName: string | null;
}
/** Reviews below this count stay hidden (RiftCompare's rule): a strip of one quote reads as staged. */
export const MIN_REVIEWS_TO_DISPLAY = 3;

const loadReviews = unstable_cache(
  async (): Promise<PublicReview[]> =>
    prisma.feedback.findMany({
      where: { status: "APPROVED", consentPublic: true, publishedAt: { not: null }, message: { not: "" } },
      orderBy: { publishedAt: "desc" },
      take: 12,
      // Never widen this to `email`: a reply address, never public.
      select: { id: true, rating: true, message: true, displayName: true },
    }),
  ["approved-reviews-v1"],
  { tags: [PRICES_TAG], revalidate: DB_TTL },
);

/** Approved, consented public feedback, newest first. Any error is an empty list. */
export async function getApprovedReviews(limit = 6): Promise<PublicReview[]> {
  try {
    return (await loadReviews()).slice(0, limit);
  } catch {
    return [];
  }
}
// ── end wave2:design ──


// ── wave2:member ──
// DEAL FINDER RANK BY CARD ID, for the personal nudge (lib/premium-nudge.ts:
// "4 cards you watch are underpriced right now"). The default "Underpriced vs
// TCGplayer" ranking (lib/deal-pages.ts rankDefaultVsTcg), which reads only
// self-cached loaders — NOT cached again here and never called from inside an
// unstable_cache callback (CLAUDE.md, Egress). Dynamic import: deal-pages
// imports this module. Ranks are 1-based; the nudge reveals only counts and
// whether a card is in the free top 3, never a price or a rank beyond that.
export async function getDealRankById(country: Country): Promise<Map<number, number>> {
  const { rankDefaultVsTcg } = await import("./deal-pages");
  const { ranked } = await rankDefaultVsTcg(country);
  return new Map(ranked.map((r, i) => [r.id, i + 1]));
}
// ── end wave2:member ──


// ── wave2:tools ──
import { cardImage } from "./images";
import { compareDemand, chartMovement, type Movement } from "./demand-movement";
import { demandWindowOrThrow, utcDayKey, type DemandDayFile, type DemandDaysFile, type DemandWindowResult } from "./demand-snapshot";
import { FREE_DEMAND_ROWS, PREMIUM_DEMAND_ROWS, type DemandWindowDays } from "./demand-view";
import { assembleRisingCards, emptyAnalysis, riseInputsFor, weekAgoRanks, type RiseAnalysis, type RiseFile, type RiseHistory, type RiseInputs, type RiseScope, type UniverseCard, type WeekAgoRanking } from "./rise-predictor";
import type { RisingSnapshotData } from "./rising-snapshot";
// Best Basket, Box EV, Demand Finder, Rising Cards and the deck library read
// through these. Same rules as every loader above: one self-cached read each,
// tagged "prices", combined with getCatalog() OUTSIDE any cache callback.

/**
 * BEST BASKET'S LISTINGS: every fresh (72 h) in-stock store listing — and in
 * the US TCGplayer's own cheapest listing — for these cards in one market.
 * eBay is never in a basket (CLAUDE.md), so it is not even read. OP Compare
 * keeps ONE row per (product, source, market), the store's best-condition copy
 * (lib/import.ts), so the member's minimum condition filters that row
 * (lib/basket-server.ts). Tuples, cheapest first.
 *
 * THE CACHE KEY IS A STABLE UNIT, NOT THE CALLER'S LIST. The first port keyed
 * each entry on the exact sorted id set of a 40-card chunk, so every pasted
 * list, watchlist, binder or set made its own entry and its own Neon read,
 * without bound (the egress rule that kept the project alive, DECISIONS
 * 2026-09-11). Now an entry is one market × one BASKET_ID_BUCKET-wide range of
 * product ids (the cards of a set have near-consecutive ids, so a list from one
 * set reads one or two entries): the key space is the catalogue's id range
 * divided by 32, whatever anyone pastes, and an entry holds at most 32 cards ×
 * the market's ~75 sources (well under 2 MB). The wrapper below is not cached;
 * it combines bucket entries and drops the tuples nobody asked for.
 */
export type BasketListingTuple = [productId: number, source: string, priceCents: number, condition: string | null, url: string];
export const BASKET_ID_CHUNK = 40;
export const BASKET_ID_BUCKET = 32;

const loadBasketBucket = unstable_cache(
  async (country: Country, bucket: number): Promise<BasketListingTuple[]> => {
    if (!Number.isInteger(bucket) || bucket < 0) return [];
    const ids = Array.from({ length: BASKET_ID_BUCKET }, (_, i) => bucket * BASKET_ID_BUCKET + i);
    const offers = await snapOffersOf(ids);
    const rows: { productId: number; o: OfferRow }[] = [];
    for (const [productId, list] of offers) {
      for (const o of list) {
        if (o.market !== country || !o.inStock || Date.now() - Date.parse(o.updatedAt) >= STALE_MS) continue;
        if (o.source.startsWith("store:") || o.source === "tcgplayer") rows.push({ productId, o });
      }
    }
    return rows
      .sort((a, b) => a.o.priceCents - b.o.priceCents)
      .slice(0, BASKET_ID_BUCKET * 120)
      .map((r): BasketListingTuple => [r.productId, r.o.source, r.o.priceCents, r.o.condition, r.o.url]);
  },
  ["basket-listings-v3"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

export async function getBasketListings(country: Country, ids: number[]): Promise<BasketListingTuple[]> {
  const want = new Set(ids.filter((n) => Number.isInteger(n) && n > 0));
  if (!want.size) return [];
  const buckets = [...new Set([...want].map((n) => Math.floor(n / BASKET_ID_BUCKET)))].sort((x, y) => x - y);
  const rows = (await Promise.all(buckets.map((b) => loadBasketBucket(country, b)))).flat();
  return rows.filter((t) => want.has(t[0]));
}
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
  // A day: a deck's rows never change after publishing, and a publish or a hide
  // revalidates DECKS_TAG at once. Its share image is ISR for a day and would be
  // cut to this TTL if it were shorter (getCatalogForImages, above).
  { tags: [DECKS_TAG], revalidate: 86400 },
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
  // DB_TTL, not an hour: the card page is ISR for six hours and would be cut to
  // this TTL if it were shorter; a publish or a hide revalidates DECKS_TAG at once.
  { tags: [DECKS_TAG], revalidate: DB_TTL },
);
// ── Demand Finder, the /movers strip and Rising Cards ──
// Both read the demand snapshot FILES and the Rising Cards feed the import
// writes to the `data` branch (lib/demand-snapshot.ts, lib/rise-predictor.ts,
// lib/tools-history.ts), plus the live counters. The history ref is read by
// the caller (getHistoryRef caches itself) and passed IN, so no cached
// callback below calls another loader, and a new import's ref is a new key.
// Readers THROW inside the cache (a failed read is never stored as "no
// demand") and the exported entry points catch outside it.

/** A history file at a pinned ref: null when it doesn't exist, a throw when it can't be read. */
async function historyFileAtOrThrow<T>(ref: string, rel: string): Promise<T | null> {
  const local = process.env.HISTORY_LOCAL_DIR;
  if (local) {
    try {
      return JSON.parse(await fs.readFile(path.join(local, rel), "utf8")) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  const r = await fetch(`${HISTORY_RAW}/${ref}/history/${rel}`, { next: { revalidate: ref === "data" ? 3600 : 30 * 86400 } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`history ${rel}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

/** The live counters: every card with any activity, as cardId → [searches, views] (id + two integers each). */
async function liveDemandOrThrow(): Promise<Record<string, [number, number]>> {
  const rows = await prisma.cardDemand.findMany({
    where: { OR: [{ searchCount: { gt: 0 } }, { viewCount: { gt: 0 } }] },
    select: { cardId: true, searchCount: true, viewCount: true },
  });
  return Object.fromEntries(rows.map((r) => [String(r.cardId), [r.searchCount, r.viewCount] as [number, number]]));
}

/** The window read, with the files at `ref` and the live counters. Throws (see above). */
export async function demandWindowAtOrThrow(ref: string, days: number, opts: { previous?: boolean } = {}): Promise<DemandWindowResult> {
  const [index, live] = await Promise.all([historyFileAtOrThrow<DemandDaysFile>(ref, "demand/days.json"), liveDemandOrThrow()]);
  return demandWindowOrThrow(days, { days: index?.days ?? [], live, today: utcDayKey(), readDay: (d) => historyFileAtOrThrow<DemandDayFile>(ref, `demand/${d}.json`) }, opts);
}

/** One ranked demand row before hydration: the card id and its counts in the window. */
export interface DemandRankRow {
  cardId: string;
  searches: number;
  views: number;
  move: Movement | null;
}
export interface DemandRanking {
  bySearch: DemandRankRow[];
  byView: DemandRankRow[];
  windowUsable: boolean;
  coveredDays: number | null;
  totalDays: number;
  previous: { startDay: string; endDay: string; coveredDays: number } | null;
}

// RiftCompare's computeTopDemand: computed once per (window, ref, day) at the
// deepest list any reader shows (PREMIUM_DEMAND_ROWS) and sliced for every
// caller. Only ids and counts are cached — a few KB; the cards are hydrated
// from the catalogue outside the cache.
const getDemandRanking = unstable_cache(
  async (days: DemandWindowDays, ref: string, _day: string): Promise<DemandRanking> => {
    const win = await demandWindowAtOrThrow(ref, days, { previous: true });
    const usable = win.baselineDay != null && win.rows.length > 0;
    if (!usable) return { bySearch: [], byView: [], windowUsable: false, coveredDays: null, totalDays: win.totalDays, previous: null };
    // Each list keeps only cards with its own metric, ordered by compareDemand —
    // the one ordering the previous period is ranked by too.
    const bySearch = win.rows.filter((r) => r.searches > 0).sort(compareDemand("searches")).slice(0, PREMIUM_DEMAND_ROWS);
    const byView = win.rows.filter((r) => r.views > 0).sort(compareDemand("views")).slice(0, PREMIUM_DEMAND_ROWS);
    const prev = win.previous ?? null;
    const searchMoves = prev ? chartMovement(bySearch.map((r) => r.cardId), prev.rows, "searches") : null;
    const viewMoves = prev ? chartMovement(byView.map((r) => r.cardId), prev.rows, "views") : null;
    return {
      bySearch: bySearch.map((r) => ({ ...r, move: searchMoves?.get(r.cardId) ?? null })),
      byView: byView.map((r) => ({ ...r, move: viewMoves?.get(r.cardId) ?? null })),
      windowUsable: true,
      coveredDays: win.coveredDays,
      totalDays: win.totalDays,
      previous: prev ? { startDay: prev.startDay, endDay: prev.endDay, coveredDays: prev.coveredDays } : null,
    };
  },
  ["oc-demand-v1"],
  { tags: [PRICES_TAG], revalidate: 172800 },
);

export interface DemandPick {
  card: CardLite & { setCode: string };
  searches: number;
  views: number;
  move: Movement | null;
}
export interface DemandResult {
  bySearch: DemandPick[];
  byView: DemandPick[];
  windowUsable: boolean;
  coveredDays: number | null;
  totalDays: number;
  failed?: boolean;
  previous: { startDay: string; endDay: string; coveredDays: number } | null;
}

/**
 * Most-searched and most-viewed cards over a window (RiftCompare's
 * getTopDemand(days, limit)): the /movers strip (7, FREE_DEMAND_ROWS) and
 * Demand Finder. Self-cached: call it directly, never from inside another
 * cache. Never throws: a failure is an empty result with `failed`.
 */
export async function getTopDemand(days: DemandWindowDays, limit: number = FREE_DEMAND_ROWS): Promise<DemandResult> {
  try {
    const ref = (await getHistoryRef()) ?? "data";
    const [full, cat] = await Promise.all([getDemandRanking(days, ref, utcDayKey()), getCatalog()]);
    const hydrate = (rows: DemandRankRow[]): DemandPick[] =>
      rows.flatMap((r) => {
        const c = cat.byId.get(Number(r.cardId));
        return c ? [{ card: { ...c, setCode: cat.setById.get(c.setId)?.code ?? "" }, searches: r.searches, views: r.views, move: r.move }] : [];
      });
    return {
      bySearch: hydrate(full.bySearch).slice(0, limit),
      byView: hydrate(full.byView).slice(0, limit),
      windowUsable: full.windowUsable,
      coveredDays: full.coveredDays,
      totalDays: full.totalDays,
      previous: full.previous,
    };
  } catch (err) {
    console.error(`[demand] getTopDemand(${days}) failed — not cached:`, err);
    return { bySearch: [], byView: [], windowUsable: false, coveredDays: null, totalDays: 0, failed: true, previous: null };
  }
}

/** The searched cards (id + counts, most searched first) and the Rising Cards feed at `ref`. Throws inside. */
export interface RiseFeed {
  searched: [id: number, searches: number, views: number][];
  file: RiseFile | null;
}

// The operational half of Rising Cards, scope-independent (RiftCompare's
// getRiseInputs + getRiseHistory in one): the 2,000 most-searched cards' ids
// and counts (a few tens of KB) and history/rising.json (each card's ≤18
// weekly prices, demand velocity, demand a week ago — a few hundred KB, well
// under 2 MB). Keyed on the ref and the day; the assembly is outside.
const getRiseFeed = unstable_cache(
  async (ref: string, _day: string): Promise<RiseFeed> => {
    const [rows, file] = await Promise.all([
      prisma.cardDemand.findMany({
        where: { searchCount: { gt: 0 } },
        orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }, { cardId: "asc" }],
        take: 2000,
        select: { cardId: true, searchCount: true, viewCount: true },
      }),
      historyFileAtOrThrow<RiseFile>(ref, "rising.json"),
    ]);
    return { searched: rows.map((r) => [r.cardId, r.searchCount, r.viewCount]), file };
  },
  ["oc-rise-feed-v1"],
  { tags: [PRICES_TAG], revalidate: 172800 },
);

async function riseParts(scope: RiseScope): Promise<{ inputs: RiseInputs; history: RiseHistory; file: RiseFile | null }> {
  const ref = (await getHistoryRef()) ?? "data";
  const [feed, cat] = await Promise.all([getRiseFeed(ref, utcDayKey()), getCatalog()]);
  const searched: UniverseCard[] = feed.searched.flatMap(([id, s, v]) => {
    const c = cat.byId.get(id);
    if (!c) return [];
    return [{
      id: String(id), slug: c.slug, name: c.name, setCode: cat.setById.get(c.setId)?.code ?? "", number: c.number, variant: c.variant,
      hasImage: c.hasImage, imageThumbUrl: c.hasImage ? cardImage.thumb(c.id) : null, searchCount: s, viewCount: v,
      marketUsd: c.marketUsd, low: c.low, stores: c.stores,
    }];
  });
  const file = feed.file;
  return {
    inputs: riseInputsFor(scope, searched, file?.velocity ?? {}, file?.snapshotDays ?? 0),
    history: { series: file?.series ?? {} },
    file,
  };
}

// Where a failed load is remembered, per scope, so an outage costs one attempt
// per five minutes per instance rather than one per request (RiftCompare's).
const riseFailedUntil = new Map<RiseScope, number>();

/**
 * THE one Rising Cards entry point — /tools/rising, /admin/rising and the
 * snapshot mint. Not a cache itself: never wrap it in one, and never call it
 * from inside an unstable_cache callback (its loaders cache themselves).
 */
export function getCachedRisingCards(scope: RiseScope): Promise<RiseAnalysis> {
  if ((riseFailedUntil.get(scope) ?? 0) > Date.now()) return Promise.resolve(emptyAnalysis(scope, true));
  return riseParts(scope)
    .then(({ inputs, history }) => assembleRisingCards(scope, inputs, history, Date.now()))
    .catch((err) => {
      console.error(`[rise-predictor] getCachedRisingCards(${scope}) failed — serving "temporarily unavailable":`, err);
      riseFailedUntil.set(scope, Date.now() + 5 * 60_000);
      return emptyAnalysis(scope, true);
    });
}

/** The ranking as it stood a week ago, for ▲▼; null when it can't be rebuilt. Self-cached through its loaders. */
export async function getRisingWeekAgo(scope: RiseScope): Promise<WeekAgoRanking | null> {
  try {
    const { inputs, history, file } = await riseParts(scope);
    return file?.weekAgo ? weekAgoRanks(scope, inputs, history, file.weekAgo, Date.now()) : null;
  } catch (err) {
    console.warn(`[rise-predictor] week-ago ranking for ${scope} unavailable:`, (err as Error).message);
    return null;
  }
}

// ── A minted Hot 40 snapshot (/rising/[token]) ──
// Frozen JSON, so cached for long; a delete revalidates RISING_SNAPSHOTS_TAG.
export const RISING_SNAPSHOTS_TAG = "rising-snapshots";
export const getRisingSnapshot = unstable_cache(
  async (token: string): Promise<{ title: string; data: RisingSnapshotData; createdAt: string } | null> => {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
    const s = await prisma.risingSnapshot.findUnique({ where: { token }, select: { title: true, data: true, createdAt: true } });
    return s ? { title: s.title, data: s.data as unknown as RisingSnapshotData, createdAt: s.createdAt.toISOString() } : null;
  },
  ["rising-snapshot-v1"],
  { tags: [RISING_SNAPSHOTS_TAG], revalidate: 86400 },
);
// ── end wave2:tools ──


// ── wave2:collection-alerts ──
// THE BINDER'S VALUE HISTORY (/portfolio, lib/collection-server.ts getPortfolio).
// Read like getProductHistory and getSparklines — GitHub raw, pinned to
// historyRef, so Next's fetch cache keeps each file for a month and the database
// is asked only for the 40-byte ref — but from history/recent/<bb>.json (the
// last 120 days, lib/history-store.ts recentOf, ~150 KB), falling back to the
// full products/<bb>.json before the import has written a recent file. Not an
// unstable_cache: the fetch cache already holds every file, and each is well
// under its 2 MB item ceiling. A binder can touch many buckets, so the ids are
// capped (RECENT_HISTORY_MAX_IDS; the caller passes its dearest cards first)
// and the files are fetched in small batches.
import { priceMapFromPoints } from "./portfolio-performance";

export const RECENT_HISTORY_MAX_IDS = 500;
const RECENT_FETCH_BATCH = 16;

/** {cardId → {day ms → US cents}} for up to RECENT_HISTORY_MAX_IDS ids (market price, else the cheapest US listing). */
export async function getRecentHistory(ids: number[]): Promise<Map<number, Map<number, number>>> {
  const want = [...new Set(ids)].slice(0, RECENT_HISTORY_MAX_IDS);
  const buckets = [...new Set(want.map(bucketOf))];
  const files = new Map<string, BucketFile | null>();
  for (let i = 0; i < buckets.length; i += RECENT_FETCH_BATCH) {
    const batch = buckets.slice(i, i + RECENT_FETCH_BATCH);
    const got = await Promise.all(
      batch.map(async (b) => (await historyFile<BucketFile>(`recent/${b}.json`)) ?? (await historyFile<BucketFile>(`products/${b}.json`))),
    );
    batch.forEach((b, j) => files.set(b, got[j]));
  }
  const out = new Map<number, Map<number, number>>();
  for (const id of want) {
    const m = priceMapFromPoints(files.get(bucketOf(id))?.p[String(id)]);
    if (m.size) out.set(id, m);
  }
  return out;
}
// THE SET CHECKLIST'S CATALOGUE (/portfolio/sets/**, lib/set-scope.ts): every
// card of one set with its cheapest in-stock STORE listing in one market.
// Card.low<M> includes eBay, so summing it for a cost to finish — or reading
// "has a price" as "in stock" — would let an eBay-only card count as available.
// So the cached half is ONE Offer groupBy for the set's product ids, by
// (product, source), min price: in stock, in the market, refreshed within the
// last 72 hours, priced, and never an eBay row (TCGplayer is a US store here, as
// the card page counts it). Its entry holds only [id, min, stores] tuples — a
// few KB a set — keyed per (set, market), tag "prices" (purged by the import),
// created on demand and never prewarmed. The card facts come from getCatalog,
// called OUTSIDE the cache (never a loader inside an unstable_cache callback).
// The result is the same for every reader in a market: no user data. Who owns
// what is the per-user, uncached lib/set-owned.ts.
import type { ChecklistCard } from "./set-scope";
import { promoOutsideSet } from "./set-scope";

const SET_CARD_CAP = 2000;

/** Pure: fold the per-(card, store) minimums into a card's min price and store count. */
export function foldStoreRows(rows: readonly { productId: number; _min: { priceCents: number | null } }[]): Map<number, { minCents: number; stores: number }> {
  const out = new Map<number, { minCents: number; stores: number }>();
  for (const r of rows) {
    const p = r._min.priceCents;
    if (p == null || p <= 0) continue;
    const prev = out.get(r.productId);
    if (!prev) out.set(r.productId, { minCents: p, stores: 1 });
    else {
      prev.stores++;
      if (p < prev.minCents) prev.minCents = p;
    }
  }
  return out;
}

const loadSetStoreMins = (setId: number, market: Country) =>
  unstable_cache(
    async (): Promise<[number, number, number][]> => {
      const cards = await snapCardsById();
      const ids = [...cards.values()].filter((c) => c.setId === setId).slice(0, SET_CARD_CAP).map((c) => c.id);
      if (!ids.length) return [];
      const offers = await snapOffersOf(ids);
      // The cheapest price per (product, source): in stock, in the market, fresh, priced, never an eBay row.
      const groups: { productId: number; _min: { priceCents: number | null } }[] = [];
      for (const [productId, list] of offers) {
        const bySource = new Map<string, number>();
        for (const o of list) {
          if (o.market !== market || !o.inStock || o.priceCents <= 0 || o.source.startsWith("ebay") || Date.now() - Date.parse(o.updatedAt) >= STALE_MS) continue;
          const prev = bySource.get(o.source);
          if (prev == null || o.priceCents < prev) bySource.set(o.source, o.priceCents);
        }
        for (const price of bySource.values()) groups.push({ productId, _min: { priceCents: price } });
      }
      return [...foldStoreRows(groups)].map(([id, v]) => [id, v.minCents, v.stores]);
    },
    ["set-checklist-v2", String(setId), market],
    { tags: [PRICES_TAG], revalidate: TTL },
  )();

/** One set's cards with each one's cheapest store listing in `market` (lib/set-scope.ts ChecklistCard). */
export async function getSetChecklist(setId: number, market: Country): Promise<ChecklistCard[]> {
  const [mins, cat] = await Promise.all([loadSetStoreMins(setId, market), getCatalog()]);
  const set = cat.setById.get(setId);
  if (!set) return [];
  const byId = new Map(mins.map(([id, min, stores]) => [id, { min, stores }]));
  return cat.cards
    .filter((c) => c.setId === setId)
    .map((c): ChecklistCard => {
      const hit = byId.get(c.id);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        number: c.number,
        variant: c.variant,
        printing: c.printing,
        rarity: c.rarity,
        setCode: set.code,
        hasImage: c.hasImage,
        isPromo: promoOutsideSet(c.printing, set.kind),
        minCents: hit?.min ?? null,
        stores: hit?.stores ?? 0,
        // The market's own lowest column says something is listed, but no store has it: eBay.
        otherSource: !hit && c.low[market] != null,
      };
    });
}
// ── end wave2:collection-alerts ──


// ── wave2:catalogue ──
// Loaders for the catalogue surfaces (eBay panels, picks, per-market history,
// support, market stats…). Every one is self-cached with the "prices" tag; never
// wrap one in another unstable_cache and never call one from inside a cache
// callback. Entries stay small (the largest is under 100 KB).
import { PANEL_MAX_AGE_HOURS, PICKS_MAX_AGE_HOURS, isChasePrinting, panelTitle, type ChaseTile, type EbayPanelData, type PickCard } from "./listing-panel";

/**
 * One product's captured eBay listings (Listings tab) and slabs (Graded tab),
 * every market. Written by scripts/ebay.ts from the SAME Browse search the
 * price pass makes (zero extra calls); read here through the Data Cache so a
 * card view costs no query. ~8 rows x 6 markets, titles trimmed: well under 10 KB.
 */
export const getEbayPanel = unstable_cache(
  async (productId: number): Promise<EbayPanelData> => snapEbayPanel(productId),
  ["ebay-panel-v2"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

/**
 * "Chase cards on eBay": the newest released booster set's (or `setId`'s) top
 * SP / Manga / Parallel / Treasure / Secret printings by TCGplayer market price,
 * each joined with its rank-0 eBay listing in every market that has a fresh one
 * with an image. At most 12 cards: a few KB.
 */
export const getEbayPicks = unstable_cache(
  async (setId: number | null): Promise<PickCard[]> => snapEbayPicks(setId),
  ["ebay-picks-v2"],
  { tags: [PRICES_TAG], revalidate: TTL },
);

/**
 * Sealed products that every store we track in a market lists as SOLD OUT on a
 * fresh read (all of the product's non-eBay rows in that market updated inside
 * 72 h, none in stock): /sealed's "Sold out at every store we track" chip and
 * lib/sealed-offers.ts soldOutEverywhere, computed once in SQL so the page needs
 * no per-product offer rows. No rows at all is "not tracked here", never "sold
 * out"; one stale row keeps the chip off. A few hundred ids at most.
 */
export const getSealedSoldOut = unstable_cache(
  async (): Promise<Record<Country, number[]>> => snapSoldOut(),
  ["sealed-soldout-v2"],
  { tags: [PRICES_TAG], revalidate: TTL },
);
// ── end wave2:catalogue ──
// ── promo ──
// The launch promotion's counter ("the first 50 accounts get a month of
// Premium"), read by /api/promo. One Counter row, 30 s cache: a sign-up shows
// within half a minute. A read error answers "none left" so the popup hides
// rather than promising a slot that may not exist.
import { LAUNCH_PROMO_ENABLED, PROMO_KEY, PROMO_SLOTS, promoStatus, type PromoStatus } from "./launch-promo-shared";

const loadPromoClaimed = unstable_cache(
  async (): Promise<number> => {
    const row = await prisma.counter.findUnique({ where: { key: PROMO_KEY }, select: { value: true } });
    return row?.value ?? 0;
  },
  ["launch-promo-claimed-v1"],
  { revalidate: 30 },
);

export async function getLaunchPromo(): Promise<PromoStatus> {
  if (!LAUNCH_PROMO_ENABLED) return promoStatus(PROMO_SLOTS);
  try {
    return promoStatus(await loadPromoClaimed());
  } catch {
    return promoStatus(PROMO_SLOTS);
  }
}
// ── end promo ──

/**
 * The chase strip's cards: the dearest chase printings across the catalogue, with
 * art, and each market's rank-0 eBay listing where a fresh one exists. A card
 * with no listing still ships (its tile links to an eBay SEARCH), so the strip
 * works before the eBay keys exist. Display-only; costs no eBay call.
 */
export const getChaseStrip = unstable_cache(
  async (): Promise<ChaseTile[]> => snapChaseStrip(),
  ["ebay-chase-strip-v2"],
  { tags: [PRICES_TAG], revalidate: TTL },
);
