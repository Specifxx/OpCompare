// The WRITER of the price snapshot (format and rules: lib/price-snapshot.ts).
// Run by scripts/price-snapshot.ts after an import. It reads the same columns
// the public loaders in lib/data.ts read and writes their answers (or the rows
// they are built from) as gzipped JSON, so a fallback read returns exactly the
// shape the page already expects. Script-side only: never imported by a page.
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { PICKS_MAX_AGE_HOURS, isChasePrinting, panelTitle, type ChaseTile, type PanelGraded, type PanelListing } from "./listing-panel";
import { cardImage } from "./images";
import {
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_SHARDS,
  SNAPSHOT_VERSION,
  isFreshAt,
  pack,
  shardOf,
  snapshotFile,
  type SnapshotMeta,
} from "./price-snapshot";
import { STORES } from "./stores";
import { keepCarried, readRunOffers } from "./run-offers";
import type { CardDetail, CoreTuple, OfferRow, PriceTuple, SealedLite, SiteStats } from "./data";

/** What card.json.gz holds: a card page's facts without its set (rejoined from core.sets) or offers (the shards). */
export type SnapshotCard = Omit<CardDetail, "set" | "offers"> & { setId: number };
export type SnapshotSealed = Omit<SealedLite, "low" | "stores"> & {
  low: SealedLite["low"];
  stores: SealedLite["stores"];
};
export interface SnapshotEbay {
  listings: Record<string, PanelListing[]>;
  graded: Record<string, PanelGraded[]>;
}

const EBAY_LIVE_DAYS = 3;

/**
 * Build the snapshot into `outDir`. `runOffersFile` is what the import just wrote
 * (lib/run-offers.ts): the offers come from it, not from a read of the Offer table
 * (~650,000 rows, over 100 MB of transfer). A source the run did not cover (a
 * store that failed, a partial import) keeps its rows from the PREVIOUS snapshot
 * on GitHub for as long as they are inside the 72-hour window, as the database
 * does. eBay rows (a few thousand) are read from Postgres: the eBay pass writes
 * them, not the import.
 */
export async function buildSnapshot(outDir: string, opts: { runOffersFile: string; log?: (m: string) => void }): Promise<SnapshotMeta> {
  const log = opts.log ?? (() => {});
  const now = Date.now();
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "offers"), { recursive: true });
  const write = async (rel: string, value: unknown) => {
    const bytes = pack(value);
    await fs.writeFile(path.join(outDir, rel), bytes);
    return bytes.length;
  };

  // ── Catalogue: facts and prices (the loadCore / loadPrices answers) ────────
  const [cardRows, sets] = await Promise.all([
    prisma.card.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true, slug: true, name: true, tcgName: true, number: true, setId: true, rarity: true, variant: true, printing: true, colors: true,
        cardType: true, cost: true, power: true, counter: true, life: true, attribute: true, subtypes: true, effect: true, finish: true,
        hasImage: true, tcgplayerUrl: true, marketUsd: true, change7d: true, change30d: true, high90Usd: true,
        lowUS: true, lowAU: true, lowUK: true, lowSG: true, lowCA: true, lowEU: true,
        storesUS: true, storesAU: true, storesUK: true, storesSG: true, storesCA: true, storesEU: true,
      },
    }),
    prisma.set.findMany({ select: { id: true, slug: true, code: true, name: true, kind: true, releasedOn: true, cardCount: true, sealedCount: true } }),
  ]);
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
      change7d: r.change7d, change30d: r.change30d, setId: r.setId,
    };
  }
  const sizes: Record<string, number> = {};
  sizes.core = await write("core.json.gz", core);
  sizes.prices = await write("prices.json.gz", prices);
  sizes.cards = await write("cards.json.gz", cards);

  // ── Sealed ─────────────────────────────────────────────────────────────────
  const sealedRows = await prisma.sealed.findMany({
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

  // ── Offers, sharded by productId; only rows refreshed inside the window ────
  const run = readRunOffers(opts.runOffersFile);
  const covered = new Set(run.covered);
  const known = new Set<string>(["tcgplayer", ...STORES.map((x) => `store:${x.key}`)]);
  const byShard = new Map<string, Record<string, OfferRow[]>>();
  let offerCount = 0;
  const add = (productId: number, o: OfferRow) => {
    const key = shardOf(productId);
    const shard = byShard.get(key) ?? {};
    (shard[productId] ??= []).push(o);
    byShard.set(key, shard);
    offerCount++;
  };
  for (const [productId, source, market, priceCents, currency, url, inStock, condition, shippingCents, t] of run.offers) {
    if (!isFreshAt(new Date(t), now)) continue;
    add(productId, { source, market, priceCents, currency, url, inStock: inStock === 1, condition, shippingCents, updatedAt: new Date(t).toISOString() });
  }
  let carried = 0;
  let previousFound = 0;
  for (let i = 0; i < SNAPSHOT_SHARDS; i++) {
    const prev = await snapshotFile<Record<string, OfferRow[]>>(`offers/${String(i).padStart(2, "0")}.json.gz`);
    if (!prev) continue;
    previousFound++;
    for (const [pid, rows] of Object.entries(prev)) {
      for (const o of rows) {
        if (!keepCarried(o, covered, known, now, SNAPSHOT_FRESH_MS)) continue;
        add(Number(pid), o);
        carried++;
      }
    }
  }
  log(`snapshot offers: ${run.offers.length} from this run (${covered.size} sources), ${carried} carried from the previous snapshot (${previousFound}/${SNAPSHOT_SHARDS} shards found)`);
  const since = new Date(now - SNAPSHOT_FRESH_MS);
  const ebayOffers = await prisma.offer.findMany({
    where: { source: { startsWith: "ebay" }, updatedAt: { gt: since } },
    select: { productId: true, source: true, market: true, priceCents: true, currency: true, url: true, inStock: true, condition: true, shippingCents: true, updatedAt: true },
  });
  for (const o of ebayOffers) {
    add(o.productId, { source: o.source, market: o.market, priceCents: o.priceCents, currency: o.currency, url: o.url, inStock: o.inStock, condition: o.condition, shippingCents: o.shippingCents, updatedAt: o.updatedAt.toISOString() });
  }
  let offerBytes = 0;
  for (const [key, shard] of byShard) {
    for (const rows of Object.values(shard)) rows.sort((a, b) => a.priceCents - b.priceCents);
    offerBytes += await write(`offers/${key}.json.gz`, shard);
  }
  sizes.offers = offerBytes;

  // ── eBay: the listings panel rows, the chase strip and the picks ───────────
  const ebaySince = new Date(now - 72 * 3600 * 1000);
  const [ebayRows, gradedRows] = await Promise.all([
    prisma.ebayListing.findMany({
      where: { updatedAt: { gte: ebaySince } },
      orderBy: [{ market: "asc" }, { rank: "asc" }],
      select: { productId: true, market: true, rank: true, priceCents: true, shippingCents: true, currency: true, url: true, title: true, imageUrl: true },
    }),
    prisma.ebayGradedListing.findMany({
      where: { updatedAt: { gte: ebaySince } },
      orderBy: [{ market: "asc" }, { priceCents: "asc" }],
      select: { productId: true, market: true, itemId: true, priceCents: true, shippingCents: true, currency: true, url: true, title: true, imageUrl: true, grader: true, grade: true },
    }),
  ]);
  const ebay: SnapshotEbay = { listings: {}, graded: {} };
  for (const { productId, ...l } of ebayRows) (ebay.listings[productId] ??= []).push({ ...l, title: panelTitle(l.title) });
  const gradedPer = new Map<number, number>();
  for (const { productId, ...g } of gradedRows) {
    const n = gradedPer.get(productId) ?? 0;
    if (n >= 24) continue; // the loader's take: 24 per product
    gradedPer.set(productId, n + 1);
    (ebay.graded[productId] ??= []).push({ ...g, title: panelTitle(g.title) });
  }
  sizes.ebay = await write("ebay.json.gz", ebay);

  const pickSince = new Date(now - PICKS_MAX_AGE_HOURS * 3600 * 1000);
  const chaseCards = await prisma.card.findMany({
    where: { marketUsd: { gt: 0 }, hasImage: true, OR: [{ printing: { in: ["sp", "manga", "alt", "treasure"] } }, { rarity: "SEC" }] },
    orderBy: { marketUsd: "desc" },
    take: 40,
    select: { id: true, slug: true, name: true, number: true, variant: true, printing: true, rarity: true, marketUsd: true },
  });
  const chase = chaseCards.filter(isChasePrinting).slice(0, 12);
  const chaseListings = chase.length
    ? await prisma.ebayListing.findMany({
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
  const [run2, ebayRun] = await Promise.all([
    prisma.importRun.findFirst({ where: { ok: true, kind: { not: "ebay" } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
    prisma.importRun.findFirst({ where: { kind: "ebay", ok: true, finishedAt: { gte: new Date(now - EBAY_LIVE_DAYS * 86_400_000) } }, select: { id: true } }),
  ]);
  const map = new Map<string, { source: string; market: string; offers: number; inStock: number }>();
  for (const shard of byShard.values()) {
    for (const rows of Object.values(shard)) {
      for (const o of rows) {
        if (o.source.startsWith("ebay")) continue; // eBay is not a store
        const k = `${o.source}|${o.market}`;
        const row = map.get(k) ?? { source: o.source, market: o.market, offers: 0, inStock: 0 };
        row.offers += 1;
        if (o.inStock) row.inStock += 1;
        map.set(k, row);
      }
    }
  }
  const stats: SiteStats = { lastImportAt: run2?.finishedAt?.toISOString() ?? null, storeOffers: [...map.values()], ebayLive: Boolean(ebayRun) };
  sizes.stats = await write("stats.json.gz", stats);

  const meta: SnapshotMeta = {
    v: SNAPSHOT_VERSION,
    generatedAt: new Date(now).toISOString(),
    lastImportAt: stats.lastImportAt,
    counts: { cards: cardRows.length, sealed: sealed.length, offers: offerCount, ebayListings: ebayRows.length },
  };
  await fs.writeFile(path.join(outDir, "meta.json"), JSON.stringify(meta));
  log(`snapshot: ${meta.counts.cards} cards, ${meta.counts.sealed} sealed, ${meta.counts.offers} offers in ${byShard.size} shards, ${meta.counts.ebayListings} eBay listings`);
  log(`snapshot bytes: ${Object.entries(sizes).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)} KB`).join(", ")}`);
  return meta;
}
