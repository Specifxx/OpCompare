// The WRITER of the price snapshot (format and rules: lib/price-snapshot.ts).
// Run by scripts/price-snapshot.ts at the end of a job that holds the public
// working copy (lib/pubdb.ts: the throwaway Postgres on the runner, seeded from
// the previous snapshot and then updated by the import or the eBay pass).
// Script-side only: never imported by a page.
//
// The snapshot is the ONLY persistent copy of the public data (owner,
// 2026-10-14): catalogue, offers and eBay state. It carries, besides the files
// the pages always read:
//   o/<range>.json.gz        offers by product-id range (a set is one or two files)
//   offers/NN.json.gz        the same offers by id % 64, for the site deployed before
//                            the migration (SNAPSHOT_LEGACY_SHARDS=0 stops writing it)
//   ebay-checks.json.gz      when each (product, market) pair was last searched on eBay
//   deal-inputs, store-prices/<market>, store-stats, store-listings/<market>,
//   sealed-soldout           the answers to the queries that scan every offer, computed
//                            here in SQL so a request never has to
// and, inside prices.json.gz, the additive `lastKnown` table (lib/last-known.ts):
// for each card with no price in some market, the sold-out row its card page
// shows as "Last seen" there (lastSeen over the very rows written below, after
// the page's own freshFromSnapshot), else the newest price its history holds.
// Built in the import from those rows and the local history checkout
// (HISTORY_DIR, which recordHistory has just written); the eBay pass has no
// history checkout and does not aggregate (the prices it publishes are the
// import's), so it carries the previous snapshot's table over unchanged.
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pub } from "./pubdb";
import { bucketOf, dayNum, type BucketFile } from "./history";
import { historyDir, readBucket } from "./history-store";
import { lastKnownTable, needsLastKnown, type LastKnownCandidate, type LastKnownFile } from "./last-known";
import { lastSeen } from "./card-price-state";
import { freshFromSnapshot } from "./price-snapshot-read";
import { PICKS_MAX_AGE_HOURS, isChasePrinting, panelTitle, type ChaseTile, type PanelGraded, type PanelListing } from "./listing-panel";
import { cardImage } from "./images";
import { MARKETS, type Country } from "./country";
import { ebaySourceFor, encodeDealInput, type DealInputTuple } from "./deals";
import {
  RANGE_SIZE,
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_OFFER_KEEP_MS,
  SNAPSHOT_SHARDS,
  SNAPSHOT_VERSION,
  pack,
  rangeOf,
  shardOf,
  snapshotFile,
  type SnapshotMeta,
} from "./price-snapshot";
import type { CardDetail, CoreTuple, OfferRow, PriceTuple, SealedLite, SiteStats, StoreListing, StoreStat } from "./data";

/** What card.json.gz holds: a card page's facts without its set (rejoined from core.sets) or offers (the shards). */
export type SnapshotCard = Omit<CardDetail, "set" | "offers"> & { setId: number; /** ISO: when TCGplayer first listed it (the weekly newsletter's "new this week"). */ firstSeen?: string };
export type SnapshotSealed = Omit<SealedLite, "low" | "stores"> & {
  low: SealedLite["low"];
  stores: SealedLite["stores"];
};
export interface SnapshotEbay {
  listings: Record<string, PanelListing[]>;
  graded: Record<string, PanelGraded[]>;
}
/** [productId, market, checkedAt (ms), matched (1/0)] */
export type EbayCheckTuple = [number, string, number, 0 | 1];
export type DealInputsFile = Record<Country, DealInputTuple[]>;
/** One market's store prices: source → flat [productId, priceCents, productId, priceCents, …], cards only, in stock and fresh. */
export type StorePricesFile = Record<string, number[]>;
export type StoreListingsFile = Record<string, { top: StoreListing[]; cheapestHere: StoreListing[] }>;
export type SoldOutFile = Record<Country, number[]>;

const FRESH_HOURS = SNAPSHOT_FRESH_MS / 3_600_000;
const legacyShards = () => process.env.SNAPSHOT_LEGACY_SHARDS !== "0";

export interface BuildOptions {
  log?: (m: string) => void;
  /** finishedAt of the newest successful import (an ImportRun row in Neon), and whether the eBay pass ran in the last 3 days. */
  lastImportAt: Date | null;
  ebayLive: boolean;
}

/** Build the snapshot into `outDir` from the working copy. */
export async function buildSnapshot(outDir: string, opts: BuildOptions): Promise<SnapshotMeta> {
  const log = opts.log ?? (() => {});
  const now = Date.now();
  // Before the output directory is cleared (a local reader may point at it).
  const carried = hasLocalHistory() ? null : await previousLastKnown(log);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "offers"), { recursive: true });
  await fs.mkdir(path.join(outDir, "o"), { recursive: true });
  await fs.mkdir(path.join(outDir, "store-prices"), { recursive: true });
  await fs.mkdir(path.join(outDir, "store-listings"), { recursive: true });
  const write = async (rel: string, value: unknown) => {
    const bytes = pack(value);
    await fs.writeFile(path.join(outDir, rel), bytes);
    return bytes.length;
  };
  const sizes: Record<string, number> = {};

  // ── Catalogue: facts and prices (the loadCore / loadPrices answers) ────────
  const [cardRows, sets] = await Promise.all([
    pub.card.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true, slug: true, name: true, tcgName: true, number: true, setId: true, rarity: true, variant: true, printing: true, colors: true,
        cardType: true, cost: true, power: true, counter: true, life: true, attribute: true, subtypes: true, effect: true, finish: true,
        hasImage: true, tcgplayerUrl: true, marketUsd: true, change7d: true, change30d: true, high90Usd: true,
        lowUS: true, lowAU: true, lowUK: true, lowSG: true, lowCA: true, lowEU: true,
        storesUS: true, storesAU: true, storesUK: true, storesSG: true, storesCA: true, storesEU: true,
        firstSeen: true,
      },
    }),
    pub.set.findMany({ select: { id: true, slug: true, code: true, name: true, tcgName: true, kind: true, releasedOn: true, cardCount: true, sealedCount: true } }),
  ]);
  // `tcgName` rides along (the store matcher needs TCGplayer's own group name); the pages' SetLite ignores it.
  const setLites = sets.map((s) => ({ ...s, releasedOn: s.releasedOn ? s.releasedOn.toISOString().slice(0, 10) : null }));
  const core = {
    // Explicit slugs (the loader's 0 = "derived" shorthand needs cardSlugBase, which lives beside next/cache).
    cards: cardRows.map(
      (r): CoreTuple => [
        r.id, r.slug, r.name, r.number, r.setId, r.rarity, r.variant, r.printing, r.colors.join(";"),
        r.cardType, r.cost, r.power, r.counter, r.life, r.hasImage ? 1 : 0,
      ],
    ),
    sets: setLites,
  };
  // Cards with no live headline somewhere: their last known prices are worked out once the offers are grouped (below).
  const lastKnownCandidates = carried
    ? []
    : cardRows.map((r): LastKnownCandidate => ({ id: r.id, marketUsd: r.marketUsd, low: [r.lowUS, r.lowAU, r.lowUK, r.lowSG, r.lowCA, r.lowEU] })).filter(needsLastKnown);
  const prices = {
    ids: cardRows.map((r) => r.id),
    prices: cardRows.map((r): PriceTuple => {
      const low = [r.lowUS, r.lowAU, r.lowUK, r.lowSG, r.lowCA, r.lowEU];
      const stores = [r.storesUS, r.storesAU, r.storesUK, r.storesSG, r.storesCA, r.storesEU];
      return [r.marketUsd, low.every((x) => x == null) ? 0 : low, stores.every((x) => x === 0) ? 0 : stores, r.change7d, r.change30d, r.high90Usd];
    }),
    at: new Date(now).toISOString(),
  };
  const cards: Record<string, SnapshotCard> = {};
  for (const r of cardRows) {
    cards[r.slug] = {
      id: r.id, slug: r.slug, name: r.name, tcgName: r.tcgName, number: r.number, rarity: r.rarity, variant: r.variant, printing: r.printing,
      colors: r.colors, cardType: r.cardType, cost: r.cost, power: r.power, counter: r.counter, life: r.life, attribute: r.attribute,
      subtypes: r.subtypes, effect: r.effect, finish: r.finish, hasImage: r.hasImage, tcgplayerUrl: r.tcgplayerUrl, marketUsd: r.marketUsd,
      change7d: r.change7d, change30d: r.change30d, setId: r.setId, firstSeen: r.firstSeen.toISOString(),
    };
  }
  sizes.core = await write("core.json.gz", core);
  sizes.cards = await write("cards.json.gz", cards);

  // ── Sealed ─────────────────────────────────────────────────────────────────
  const sealedRows = await pub.sealed.findMany({
    select: {
      id: true, slug: true, name: true, setId: true, kind: true, packCount: true, imageUrl: true, releasedOn: true, presale: true,
      marketUsd: true, change7d: true, tcgplayerUrl: true,
      lowUS: true, lowAU: true, lowUK: true, lowSG: true, lowCA: true, lowEU: true,
      storesUS: true, storesAU: true, storesUK: true, storesSG: true, storesCA: true, storesEU: true,
    },
  });
  const sealed: SealedLite[] = sealedRows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, setId: r.setId, kind: r.kind, packCount: r.packCount, imageUrl: r.imageUrl,
    releasedOn: r.releasedOn ? r.releasedOn.toISOString().slice(0, 10) : null, presale: r.presale, marketUsd: r.marketUsd,
    change7d: r.change7d, tcgplayerUrl: r.tcgplayerUrl,
    low: { US: r.lowUS, AU: r.lowAU, UK: r.lowUK, SG: r.lowSG, CA: r.lowCA, EU: r.lowEU },
    stores: { US: r.storesUS, AU: r.storesAU, UK: r.storesUK, SG: r.storesSG, CA: r.storesCA, EU: r.storesEU },
  }));
  sizes.sealed = await write("sealed.json.gz", sealed);

  // ── Offers: every row refreshed inside the 72-hour window ──────────────────
  // The working copy was seeded from the previous snapshot and then updated by
  // this job, so it already holds a store that failed this run (its old rows,
  // until they age out) and the eBay rows: one read of local rows, no carry-over.
  // A store's rows are kept for 14 days (SNAPSHOT_OFFER_KEEP_MS) though the pages show them as sold out
  // after 72 hours: the alert engine tells "sold out" from "its only scraper is down" by looking at rows
  // that old (lib/alert-price.ts ALERT_OUTAGE_MAX_MS). eBay rows are dropped at 72 hours.
  const since = new Date(now - SNAPSHOT_OFFER_KEEP_MS);
  const ebaySinceMs = now - SNAPSHOT_FRESH_MS;
  const offerRows = await pub.offer.findMany({
    where: { updatedAt: { gt: since } },
    select: { productId: true, source: true, market: true, priceCents: true, currency: true, url: true, inStock: true, condition: true, shippingCents: true, updatedAt: true },
  });
  const byRange = new Map<string, Record<string, OfferRow[]>>();
  const byShard = new Map<string, Record<string, OfferRow[]>>();
  const put = (m: Map<string, Record<string, OfferRow[]>>, key: string, productId: number, o: OfferRow) => {
    const shard = m.get(key) ?? {};
    (shard[productId] ??= []).push(o);
    m.set(key, shard);
  };
  const storeMap = new Map<string, { source: string; market: string; offers: number; inStock: number }>();
  for (const r of offerRows) {
    if (r.source.startsWith("ebay") && r.updatedAt.getTime() <= ebaySinceMs) continue;
    const o: OfferRow = { source: r.source, market: r.market, priceCents: r.priceCents, currency: r.currency, url: r.url, inStock: r.inStock, condition: r.condition, shippingCents: r.shippingCents, updatedAt: r.updatedAt.toISOString() };
    put(byRange, rangeOf(r.productId), r.productId, o);
    if (legacyShards()) put(byShard, shardOf(r.productId), r.productId, o);
    if (!r.source.startsWith("ebay") && r.updatedAt.getTime() > ebaySinceMs) {
      // eBay is not a store: never in store counts or homepage stats. Only rows inside 72 hours count.
      const k = `${r.source}|${r.market}`;
      const row = storeMap.get(k) ?? { source: r.source, market: r.market, offers: 0, inStock: 0 };
      row.offers += 1;
      if (r.inStock) row.inStock += 1;
      storeMap.set(k, row);
    }
  }
  let offerBytes = 0;
  for (const [key, shard] of byRange) {
    for (const rows of Object.values(shard)) rows.sort((a, b) => a.priceCents - b.priceCents);
    offerBytes += await write(`o/${key}.json.gz`, shard);
  }
  sizes.offersByRange = offerBytes;
  if (legacyShards()) {
    let legacyBytes = 0;
    for (let i = 0; i < SNAPSHOT_SHARDS; i++) {
      const key = String(i).padStart(2, "0");
      const shard = byShard.get(key) ?? {};
      for (const rows of Object.values(shard)) rows.sort((a, b) => a.priceCents - b.priceCents);
      legacyBytes += await write(`offers/${key}.json.gz`, shard);
    }
    sizes.offersLegacy = legacyBytes;
  }
  log(`snapshot offers: ${offerRows.length} rows read in ${byRange.size} range files${legacyShards() ? ` and ${SNAPSHOT_SHARDS} legacy shards` : ""}`);

  // ── Last known prices (prices.json.gz `lastKnown`, additive) ──────────────
  // The card page's own rule, on the rows it will read: freshFromSnapshot (a
  // store row older than 72 hours is sold out, a stale eBay row is gone), then
  // lastSeen. A market whose page shows "Last seen" gets that figure and day;
  // the others get the newest priced history day.
  let lastKnown: LastKnownFile | null;
  if (carried) {
    lastKnown = carried.table;
  } else {
    const series = historySeriesOf(lastKnownCandidates.map((c) => c.id));
    const offersOf = new Map<number, OfferRow[]>();
    const rowsOf = (id: number): OfferRow[] => {
      let rows = offersOf.get(id);
      if (!rows) offersOf.set(id, (rows = freshFromSnapshot(byRange.get(rangeOf(id))?.[id] ?? [], now)));
      return rows;
    };
    lastKnown = lastKnownTable(lastKnownCandidates, (id) => series.get(id), dayNum(new Date(now).toISOString()), (id, m) => lastSeen(rowsOf(id), m));
  }
  log(`last known prices: ${lastKnown ? `${Object.keys(lastKnown).length} cards (${carried ? "carried over from the previous snapshot" : "from sold-out rows and the history"})` : "none (no history here and none in the previous snapshot)"}`);
  // Additive: readers that predate it (the seed, the alerts, an older site) ignore it.
  sizes.prices = await write("prices.json.gz", { ...prices, ...(lastKnown ? { lastKnown } : {}) });

  // ── eBay: the listings panel rows, the chase strip, the picks and the pass's memory ──
  const ebaySince = new Date(now - 72 * 3600 * 1000);
  const [ebayRows, gradedRows, checkRows] = await Promise.all([
    pub.ebayListing.findMany({
      where: { updatedAt: { gte: ebaySince } },
      orderBy: [{ market: "asc" }, { rank: "asc" }],
      select: { productId: true, market: true, rank: true, priceCents: true, shippingCents: true, currency: true, url: true, title: true, imageUrl: true, updatedAt: true },
    }),
    pub.ebayGradedListing.findMany({
      where: { updatedAt: { gte: ebaySince } },
      orderBy: [{ market: "asc" }, { priceCents: "asc" }],
      select: { productId: true, market: true, itemId: true, priceCents: true, shippingCents: true, currency: true, url: true, title: true, imageUrl: true, grader: true, grade: true, updatedAt: true },
    }),
    pub.ebayCheck.findMany({ select: { productId: true, market: true, checkedAt: true, matched: true } }),
  ]);
  const ebay: SnapshotEbay = { listings: {}, graded: {} };
  for (const { productId, updatedAt, ...l } of ebayRows) (ebay.listings[productId] ??= []).push({ ...l, title: panelTitle(l.title), u: updatedAt.getTime() });
  const gradedPer = new Map<number, number>();
  for (const { productId, updatedAt, ...g } of gradedRows) {
    const n = gradedPer.get(productId) ?? 0;
    if (n >= 24) continue; // the loader's take: 24 per product
    gradedPer.set(productId, n + 1);
    (ebay.graded[productId] ??= []).push({ ...g, title: panelTitle(g.title), u: updatedAt.getTime() });
  }
  sizes.ebay = await write("ebay.json.gz", ebay);
  const checks: EbayCheckTuple[] = checkRows.map((c) => [c.productId, c.market, c.checkedAt.getTime(), c.matched ? 1 : 0]);
  sizes.ebayChecks = await write("ebay-checks.json.gz", checks);

  const pickSince = new Date(now - PICKS_MAX_AGE_HOURS * 3600 * 1000);
  const chaseCards = await pub.card.findMany({
    where: { marketUsd: { gt: 0 }, hasImage: true, OR: [{ printing: { in: ["sp", "manga", "alt", "treasure"] } }, { rarity: "SEC" }] },
    orderBy: { marketUsd: "desc" },
    take: 40,
    select: { id: true, slug: true, name: true, number: true, variant: true, printing: true, rarity: true, marketUsd: true },
  });
  const chase = chaseCards.filter(isChasePrinting).slice(0, 12);
  const chaseListings = chase.length
    ? await pub.ebayListing.findMany({
        where: { productId: { in: chase.map((c) => c.id) }, rank: 0, imageUrl: { not: null }, updatedAt: { gte: pickSince } },
        select: { productId: true, market: true, priceCents: true, shippingCents: true, currency: true, url: true, title: true, imageUrl: true },
      })
    : [];
  const chaseStrip = chase.map((c): ChaseTile => {
    const listings: ChaseTile["listings"] = {};
    for (const r of chaseListings) if (r.productId === c.id && r.imageUrl) listings[r.market] = { priceCents: r.priceCents, shippingCents: r.shippingCents, currency: r.currency, url: r.url, imageUrl: r.imageUrl };
    return { id: c.id, slug: c.slug, name: c.name, number: c.number, variant: c.variant, marketUsd: c.marketUsd!, imageUrl: cardImage.tile(c.id), listings };
  });
  sizes.chase = await write("chase.json.gz", chaseStrip);

  // ── Site stats (the getSiteStats answer), from the offers above ────────────
  const stats: SiteStats = { lastImportAt: opts.lastImportAt?.toISOString() ?? null, storeOffers: [...storeMap.values()], ebayLive: opts.ebayLive };
  sizes.stats = await write("stats.json.gz", stats);

  // ── The queries that scan every offer, answered here in SQL ────────────────
  sizes.derived = await writeDerived(write);

  const meta: SnapshotMeta = {
    v: SNAPSHOT_VERSION,
    generatedAt: new Date(now).toISOString(),
    lastImportAt: stats.lastImportAt,
    counts: { cards: cardRows.length, sealed: sealed.length, offers: offerRows.length, ebayListings: ebayRows.length },
    ranges: [...byRange.keys()].sort(),
    ebayChecks: checks.length,
  };
  await fs.writeFile(path.join(outDir, "meta.json"), JSON.stringify(meta));
  log(`snapshot: ${meta.counts.cards} cards, ${meta.counts.sealed} sealed, ${meta.counts.offers} offers, ${meta.counts.ebayListings} eBay listings, ${checks.length} eBay checks`);
  log(`snapshot bytes: ${Object.entries(sizes).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)} KB`).join(", ")}`);
  void RANGE_SIZE;
  return meta;
}

// ── Last known prices (lib/last-known.ts) ────────────────────────────────────
// Built from the local history checkout when there is one (the import:
// HISTORY_DIR holds the bucket files recordHistory has just written), else the
// table of the snapshot being replaced is carried over (the eBay pass, which has
// no history checkout and does not aggregate, so the prices it publishes are the
// import's). Never fails the build: without either, the snapshot has none.
const hasLocalHistory = () => existsSync(path.join(historyDir(), "products"));

/** The raw series of these products, one bucket file read at a time (only their series are kept). */
function historySeriesOf(ids: number[]): Map<number, BucketFile["p"][string]> {
  const byBucket = new Map<string, number[]>();
  for (const id of ids) (byBucket.get(bucketOf(id)) ?? byBucket.set(bucketOf(id), []).get(bucketOf(id))!).push(id);
  const out = new Map<number, BucketFile["p"][string]>();
  for (const [b, pids] of byBucket) {
    const f = readBucket(b);
    for (const id of pids) {
      const series = f.p[String(id)];
      if (series) out.set(id, series);
    }
  }
  return out;
}

async function previousLastKnown(log: (m: string) => void): Promise<{ table: LastKnownFile | null }> {
  try {
    const prev = await snapshotFile<{ lastKnown?: LastKnownFile }>("prices.json.gz");
    return { table: prev?.lastKnown ?? null };
  } catch (e) {
    log(`last known prices: the previous snapshot could not be read (${(e as Error).message})`);
    return { table: null };
  }
}

type Writer = (rel: string, value: unknown) => Promise<number>;

/** The derived files; returns the bytes written. Same SQL the pages used to run against Neon (lib/data.ts, before the migration). */
async function writeDerived(write: Writer): Promise<number> {
  let bytes = 0;

  // Deal Finder's inputs: one compact tuple per card with a fresh listing, per market.
  const dealInputs = {} as DealInputsFile;
  for (const country of MARKETS) {
    const ebaySource = ebaySourceFor(country) ?? "";
    const rows = await pub.$queryRaw<{ id: number; storeMin: number | null; tcgLow: number | null; ebayCents: number | null; ebayKnown: boolean | null }[]>`
      WITH fresh AS (
        SELECT o."productId" AS id, o.source, o."priceCents" AS p, o."shippingCents" AS s
        FROM "Offer" o JOIN "Card" c ON c.id = o."productId"
        WHERE o.market = ${country} AND o."inStock" AND o."updatedAt" > now() - make_interval(hours => ${FRESH_HOURS}::int)
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
      ORDER BY ids.id`;
    const n = (v: unknown) => (v == null ? null : Number(v));
    dealInputs[country] = rows.map((r) => encodeDealInput({ id: Number(r.id), storeMin: n(r.storeMin), tcgLow: n(r.tcgLow), ebayCents: n(r.ebayCents), ebayKnown: r.ebayKnown }, country));
  }
  bytes += await write("deal-inputs.json.gz", dealInputs);

  // The Deal Finder's store picker: every store's price per card, per market.
  // Per-store files would be 400; per-market files keep each under ~1 MB.
  for (const country of MARKETS) {
    const rows = await pub.$queryRaw<{ id: number; source: string; p: number }[]>`
      SELECT o."productId" AS id, o.source, o."priceCents" AS p
      FROM "Offer" o JOIN "Card" c ON c.id = o."productId"
      WHERE o.market = ${country} AND o."inStock" AND o.source LIKE 'store:%' AND o."updatedAt" > now() - make_interval(hours => ${FRESH_HOURS}::int)
      ORDER BY o.source, o."productId"`;
    const file: StorePricesFile = {};
    for (const r of rows) (file[r.source] ??= []).push(Number(r.id), Number(r.p));
    bytes += await write(`store-prices/${country}.json.gz`, file);
  }

  // /stores/[slug]: each store's footprint in each market.
  const storeStats = await pub.$queryRaw<(StoreStat & { newest: Date | null })[]>`
    WITH o AS (
      SELECT o.source, o.market, o."priceCents", o."updatedAt", c.id AS card_id, s.id AS sealed_id,
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
      count(*) FILTER (WHERE live AND "priceCents" = low)::int AS cheapest,
      max("updatedAt") AS newest
    FROM o GROUP BY source, market`;
  bytes += await write("store-stats.json.gz", storeStats);

  // /stores/[slug]'s showcase: each store's 24 dearest in-stock listings, and the 24 most valuable
  // cards where it is the cheapest listing in its market. Per market.
  for (const country of MARKETS) {
    const low = `"low${country}"`; // a fixed column name from MARKETS, never user input
    const top = await pub.$queryRawUnsafe<{ source: string; productId: number; priceCents: number; condition: string | null; url: string }[]>(
      `SELECT source, "productId", "priceCents", condition, url FROM (
         SELECT o.source, o."productId", o."priceCents", o.condition, o.url,
                row_number() OVER (PARTITION BY o.source ORDER BY o."priceCents" DESC, o."productId") AS rn
         FROM "Offer" o WHERE o.market = $1 AND o.source LIKE 'store:%' AND o."inStock" AND o."updatedAt" > now() - interval '72 hours'
       ) t WHERE rn <= 24 ORDER BY source, rn`,
      country,
    );
    const cheap = await pub.$queryRawUnsafe<{ source: string; productId: number; priceCents: number; condition: string | null; url: string }[]>(
      `SELECT source, "productId", "priceCents", condition, url FROM (
         SELECT o.source, o."productId", o."priceCents", o.condition, o.url,
                row_number() OVER (PARTITION BY o.source ORDER BY c."marketUsd" DESC, o."productId") AS rn
         FROM "Offer" o JOIN "Card" c ON c.id = o."productId"
         WHERE o.market = $1 AND o.source LIKE 'store:%' AND o."inStock" AND o."updatedAt" > now() - interval '72 hours'
           AND o."priceCents" = c.${low} AND c."marketUsd" IS NOT NULL
       ) t WHERE rn <= 24 ORDER BY source, rn`,
      country,
    );
    const file: StoreListingsFile = {};
    for (const r of top) (file[r.source] ??= { top: [], cheapestHere: [] }).top.push([Number(r.productId), Number(r.priceCents), r.condition, r.url]);
    for (const r of cheap) (file[r.source] ??= { top: [], cheapestHere: [] }).cheapestHere.push([Number(r.productId), Number(r.priceCents), r.condition, r.url]);
    bytes += await write(`store-listings/${country}.json.gz`, file);
  }

  // /sealed's "sold out at every store we track".
  const soldRows = await pub.$queryRaw<{ id: number; market: string }[]>`
    SELECT o."productId" AS id, o.market
    FROM "Offer" o JOIN "Sealed" s ON s.id = o."productId"
    WHERE o.source NOT LIKE 'ebay%'
    GROUP BY o."productId", o.market
    HAVING NOT bool_or(o."inStock") AND MIN(o."updatedAt") > now() - make_interval(hours => ${FRESH_HOURS}::int)`;
  const soldOut = { US: [], AU: [], UK: [], SG: [], CA: [], EU: [] } as SoldOutFile;
  for (const r of soldRows) (soldOut[r.market as Country] ?? []).push(Number(r.id));
  bytes += await write("sealed-soldout.json.gz", soldOut);
  return bytes;
}
