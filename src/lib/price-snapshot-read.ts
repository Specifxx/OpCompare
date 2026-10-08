// The READ side of the price snapshot: each function returns what the matching
// loader in lib/data.ts returns, built from the snapshot files, or null when the
// snapshot cannot answer. Used only through dbOrSnapshot() (lib/price-snapshot.ts).
// Offers are filtered through the same 72-hour freshness rule as the database
// path, so a snapshot that outlives a long outage shows its stores as sold out
// and drops its eBay rows rather than serving dead prices.
import type { CardDetail, CoreTuple, OfferRow, PriceTuple, SealedLite, SiteStats, SetLite } from "./data";
import type { ChaseTile, EbayPanelData } from "./listing-panel";
import { PANEL_MAX_AGE_HOURS } from "./listing-panel";
import { SNAPSHOT_FRESH_MS, shardOf, snapshotFile, type SnapshotMeta } from "./price-snapshot";
import type { SnapshotCard, SnapshotEbay } from "./price-snapshot-build";

type OfferShard = Record<string, OfferRow[]>;

export const snapMeta = () => snapshotFile<SnapshotMeta>("meta.json");

export async function snapCore(): Promise<{ cards: CoreTuple[]; sets: SetLite[] } | null> {
  return snapshotFile<{ cards: CoreTuple[]; sets: SetLite[] }>("core.json.gz");
}

export async function snapPrices(): Promise<{ ids: number[]; prices: PriceTuple[]; at: string } | null> {
  return snapshotFile<{ ids: number[]; prices: PriceTuple[]; at: string }>("prices.json.gz");
}

/** The card page's offers: the same stale rule as lib/data.ts freshOffers (a stale store row is sold out, a stale eBay row is dropped). */
export function freshFromSnapshot(rows: OfferRow[], now: number = Date.now()): OfferRow[] {
  return rows
    .map((o) => ({ ...o, inStock: o.inStock && now - Date.parse(o.updatedAt) < SNAPSHOT_FRESH_MS }))
    .filter((o) => o.inStock || !o.source.startsWith("ebay"))
    .sort((a, b) => a.priceCents - b.priceCents);
}

async function offersFor(productId: number): Promise<OfferRow[] | null> {
  const shard = await snapshotFile<OfferShard>(`offers/${shardOf(productId)}.json.gz`);
  if (!shard) return null;
  return freshFromSnapshot(shard[String(productId)] ?? []);
}

export async function snapCardDetail(slug: string): Promise<CardDetail | null> {
  const [cards, core] = await Promise.all([snapshotFile<Record<string, SnapshotCard>>("cards.json.gz"), snapCore()]);
  const c = cards?.[slug];
  if (!c || !core) return null;
  const set = core.sets.find((s) => s.id === c.setId);
  const offers = await offersFor(c.id);
  if (!set || !offers) return null;
  const { setId: _setId, ...rest } = c;
  void _setId;
  return { ...rest, set, offers };
}

export async function snapSealedCatalog(): Promise<SealedLite[] | null> {
  return snapshotFile<SealedLite[]>("sealed.json.gz");
}

export async function snapSealedDetail(slug: string): Promise<(Omit<SealedLite, "low" | "stores"> & { offers: OfferRow[] }) | null> {
  const all = await snapSealedCatalog();
  const s = all?.find((x) => x.slug === slug);
  if (!s) return null;
  const offers = await offersFor(s.id);
  if (!offers) return null;
  const { low: _low, stores: _stores, ...rest } = s;
  void _low;
  void _stores;
  return { ...rest, offers };
}

export async function snapSiteStats(): Promise<SiteStats | null> {
  return snapshotFile<SiteStats>("stats.json.gz");
}

export async function snapEbayPanel(productId: number): Promise<EbayPanelData | null> {
  const e = await snapshotFile<SnapshotEbay>("ebay.json.gz");
  if (!e) return null;
  void PANEL_MAX_AGE_HOURS;
  return { listings: e.listings[String(productId)] ?? [], graded: e.graded[String(productId)] ?? [] };
}

export async function snapChaseStrip(): Promise<ChaseTile[] | null> {
  return snapshotFile<ChaseTile[]>("chase.json.gz");
}
