// The READ side of the price snapshot: every public loader in lib/data.ts is
// answered from these files (format and rules: lib/price-snapshot.ts). The
// catalogue, offers and eBay state are not in Neon (owner, 2026-10-14); the
// `snapshot` branch on GitHub is their only copy, written by the import and the
// eBay pass (lib/price-snapshot-build.ts).
//
// TWO RULES:
//  1. A file that cannot be read THROWS. Returning null for it would let a
//     caller (and unstable_cache) store "card not found" or "no deals" for hours
//     after a GitHub hiccup. Null means only "this snapshot says there is no such
//     thing": a slug it does not have, a product with no offers.
//  2. A snapshot is served however old it is. The watchdog (lib/health.ts) warns
//     when it ages; a stale price page is better than none, and every offer
//     carries its own timestamp, so the 72-hour rule below makes a store that
//     stopped reporting read as sold out rather than as a live price.
import type { CardDetail, CoreTuple, OfferRow, PriceTuple, SealedLite, SetLite, SiteStats, StoreListing, StoreStat } from "./data";
import type { ChaseTile, EbayPanelData, PickCard } from "./listing-panel";
import { PICKS_MAX_AGE_HOURS, isChasePrinting, panelTitle } from "./listing-panel";
import { SNAPSHOT_FRESH_MS, rangeFile, shardOf, snapshotFile, type SnapshotMeta } from "./price-snapshot";
import type { DealInputsFile, SnapshotCard, SnapshotEbay, SoldOutFile, StoreListingsFile, StorePricesFile } from "./price-snapshot-build";
import type { Country } from "./country";
import { MARKETS } from "./country";
import type { DealInputTuple } from "./deals";

type OfferShard = Record<string, OfferRow[]>;

/** A snapshot file, or a throw: see rule 1. */
async function need<T>(rel: string): Promise<T> {
  const v = await snapshotFile<T>(rel);
  if (v == null) throw new Error(`price snapshot: ${rel} could not be read`);
  return v;
}

export const snapMeta = () => snapshotFile<SnapshotMeta>("meta.json");

export type SnapshotCore = { cards: CoreTuple[]; sets: SetLite[] };
export const snapCore = (): Promise<SnapshotCore> => need<SnapshotCore>("core.json.gz");
export const snapPrices = (): Promise<{ ids: number[]; prices: PriceTuple[]; at: string }> => need("prices.json.gz");
export const snapSealedCatalog = (): Promise<SealedLite[]> => need<SealedLite[]>("sealed.json.gz");
export const snapSiteStats = (): Promise<SiteStats> => need<SiteStats>("stats.json.gz");
export const snapChaseStrip = (): Promise<ChaseTile[]> => need<ChaseTile[]>("chase.json.gz");

/** Every card's facts, by slug. Memoised for ten minutes with the file itself. */
export const snapCards = () => need<Record<string, SnapshotCard>>("cards.json.gz");

let byIdMemo: { src: object; value: Map<number, SnapshotCard> } | null = null;
/** The same cards by TCGplayer id. */
export async function snapCardsById(): Promise<Map<number, SnapshotCard>> {
  const cards = await snapCards();
  if (byIdMemo && byIdMemo.src === cards) return byIdMemo.value;
  const value = new Map(Object.values(cards).map((c) => [c.id, c]));
  byIdMemo = { src: cards, value };
  return value;
}

/** The card page's offers: the same stale rule as always (a stale store row is sold out, a stale eBay row is dropped). */
export function freshFromSnapshot(rows: OfferRow[], now: number = Date.now()): OfferRow[] {
  return rows
    .map((o) => ({ ...o, inStock: o.inStock && now - Date.parse(o.updatedAt) < SNAPSHOT_FRESH_MS }))
    .filter((o) => o.inStock || !o.source.startsWith("ebay"))
    .sort((a, b) => a.priceCents - b.priceCents);
}

/**
 * The offers of some products, raw, by product id. Reads one small file per
 * 1,024-id range (a set's cards are near-consecutive, so a basket or a checklist
 * is one or two files); a snapshot written before the range files reads the
 * legacy `offers/NN` shards instead. A range with no offers has no file, which
 * is an answer; a file the snapshot lists but GitHub will not serve throws.
 */
export async function snapOffersOf(ids: Iterable<number>): Promise<Map<number, OfferRow[]>> {
  const want = new Set(ids);
  const out = new Map<number, OfferRow[]>();
  if (!want.size) return out;
  const meta = await need<SnapshotMeta>("meta.json");
  const files = new Map<string, number[]>();
  for (const id of want) {
    const f = meta.ranges ? rangeFile(id) : `offers/${shardOf(id)}.json.gz`;
    (files.get(f) ?? files.set(f, []).get(f)!).push(id);
  }
  for (const [file, pids] of files) {
    const listed = !meta.ranges || meta.ranges.includes(file.slice(2, 5));
    if (!listed) continue; // no offers in this range: nothing to read
    const shard = await need<OfferShard>(file);
    for (const id of pids) {
      const rows = shard[String(id)];
      if (rows) out.set(id, rows);
    }
  }
  return out;
}

export async function snapCardDetail(slug: string): Promise<CardDetail | null> {
  const [cards, core] = await Promise.all([snapCards(), snapCore()]);
  const c = cards[slug];
  if (!c) return null;
  const set = core.sets.find((s) => s.id === c.setId);
  if (!set) throw new Error(`price snapshot: card ${slug} names set ${c.setId}, which core.json.gz does not have`);
  const offers = freshFromSnapshot((await snapOffersOf([c.id])).get(c.id) ?? []);
  const { setId: _setId, firstSeen: _firstSeen, ...rest } = c;
  void _setId;
  void _firstSeen;
  return { ...rest, set, offers };
}

export async function snapSealedDetail(slug: string): Promise<(Omit<SealedLite, "low" | "stores"> & { offers: OfferRow[] }) | null> {
  const s = (await snapSealedCatalog()).find((x) => x.slug === slug);
  if (!s) return null;
  const offers = freshFromSnapshot((await snapOffersOf([s.id])).get(s.id) ?? []);
  const { low: _low, stores: _stores, ...rest } = s;
  void _low;
  void _stores;
  return { ...rest, offers };
}

export async function snapEbayPanel(productId: number): Promise<EbayPanelData> {
  const e = await need<SnapshotEbay>("ebay.json.gz");
  return { listings: e.listings[String(productId)] ?? [], graded: e.graded[String(productId)] ?? [] };
}

// ── The answers the import computed in SQL ───────────────────────────────────
export const snapDealInputs = async (country: Country): Promise<DealInputTuple[]> => (await need<DealInputsFile>("deal-inputs.json.gz"))[country] ?? [];

/** The store picker's data: each store's price per card in a market. */
export const snapStorePrices = (country: Country): Promise<StorePricesFile> => need<StorePricesFile>(`store-prices/${country}.json.gz`);

export async function snapStoreStats(): Promise<StoreStat[]> {
  return (await need<(StoreStat & { newest?: unknown })[]>("store-stats.json.gz")).map(({ newest: _n, ...r }) => (void _n, r));
}

export async function snapStoreListings(country: Country, source: string): Promise<{ top: StoreListing[]; cheapestHere: StoreListing[] }> {
  return (await need<StoreListingsFile>(`store-listings/${country}.json.gz`))[source] ?? { top: [], cheapestHere: [] };
}

export const snapSoldOut = (): Promise<SoldOutFile> => need<SoldOutFile>("sealed-soldout.json.gz");

// ── Derived here from the files, in the reader's own memory ──────────────────

/** Card types and the effect text per card NUMBER (one printing per number: the standard one, else the lowest id). */
export async function snapCardTextRows(): Promise<{ number: string; subtypes: string[]; effect: string | null }[]> {
  const cards = Object.values(await snapCards()).filter((c) => c.number != null && c.printing !== "don");
  const best = new Map<string, SnapshotCard>();
  for (const c of cards) {
    const prev = best.get(c.number!);
    if (!prev || (c.printing === "standard" && prev.printing !== "standard") || (c.printing === prev.printing && c.id < prev.id)) best.set(c.number!, c);
  }
  return [...best.values()].sort((a, b) => a.number!.localeCompare(b.number!)).map((c) => ({ number: c.number!, subtypes: c.subtypes, effect: c.effect }));
}

/** "Chase cards on eBay": a set's top SP / Manga / Alternate / Treasure / Secret printings joined with their rank-0 eBay listing per market. */
export async function snapEbayPicks(setId: number | null, now: number = Date.now()): Promise<PickCard[]> {
  const [core, cards, ebay] = await Promise.all([snapCore(), snapCardsById(), need<SnapshotEbay>("ebay.json.gz")]);
  let sid = setId;
  if (sid == null) {
    const today = new Date(now).toISOString().slice(0, 10);
    sid = [...core.sets].filter((s) => s.kind === "booster" && s.releasedOn != null && s.releasedOn <= today).sort((a, b) => (b.releasedOn ?? "").localeCompare(a.releasedOn ?? ""))[0]?.id ?? null;
  }
  if (sid == null) return [];
  const setCode = core.sets.find((s) => s.id === sid)?.code ?? "";
  const chase = [...cards.values()]
    .filter((c) => c.setId === sid && (c.marketUsd ?? 0) > 0 && (["sp", "manga", "alt", "treasure"].includes(c.printing) || c.rarity === "SEC"))
    .sort((a, b) => b.marketUsd! - a.marketUsd! || a.id - b.id)
    .slice(0, 24)
    .filter(isChasePrinting)
    .slice(0, 12);
  const since = now - PICKS_MAX_AGE_HOURS * 3600 * 1000;
  return chase
    .map((c): PickCard => {
      const listings: PickCard["listings"] = {};
      for (const l of ebay.listings[String(c.id)] ?? []) {
        if (l.rank === 0 && l.imageUrl && (l.u == null || l.u >= since)) listings[l.market] = { priceCents: l.priceCents, shippingCents: l.shippingCents, currency: l.currency, url: l.url, title: panelTitle(l.title), imageUrl: l.imageUrl };
      }
      return { id: c.id, slug: c.slug, name: c.name, number: c.number, variant: c.variant, setCode, marketUsd: c.marketUsd!, listings };
    })
    .filter((c) => Object.keys(c.listings).length > 0);
}

export { MARKETS };
