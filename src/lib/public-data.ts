// THE READ SIDE OF THE PUBLIC DATA, for everything that is not a page loader:
// alerts, the newsletter, the inbox, the collection, the admin pages. The
// catalogue, offers and eBay state are not in Neon (owner, 2026-10-14): they are
// the files of the `snapshot` branch on GitHub (lib/price-snapshot.ts). This
// module turns those files back into rows.
//
// WHERE THE FILES COME FROM, one rule (lib/price-snapshot.ts snapshotFile):
//   SNAPSHOT_LOCAL_DIR  a local build: a job that has just built the snapshot
//                       (the alert steps read .snapshot-out, so they see exactly
//                       the prices this import wrote, with no CDN lag)
//   otherwise           GitHub's raw CDN, as the site does
//
// Rows have the shape the Prisma models had (Date objects, flattened low<M> and
// stores<M>, the card's `set`), so code that read them from Postgres reads them
// from here unchanged (lib/public-db.ts gives them a Prisma-shaped client).
import { MARKETS } from "./country";
import { RANGE_SIZE, rangeFile, shardOf, snapshotFile, type SnapshotMeta } from "./price-snapshot";
import type { EbayCheckTuple, SnapshotCard } from "./price-snapshot-build";
import type { CoreTuple, OfferRow, PriceTuple, SealedLite } from "./data";

export interface PublicSet {
  id: number;
  slug: string;
  code: string;
  name: string;
  tcgName: string;
  kind: string;
  releasedOn: Date | null;
  cardCount: number;
  sealedCount: number;
}

export type PublicLows = { lowUS: number | null; lowAU: number | null; lowUK: number | null; lowSG: number | null; lowCA: number | null; lowEU: number | null };
export type PublicStores = { storesUS: number; storesAU: number; storesUK: number; storesSG: number; storesCA: number; storesEU: number };

export interface PublicCard extends PublicLows, PublicStores {
  id: number;
  slug: string;
  name: string;
  tcgName: string;
  number: string | null;
  setId: number;
  set: PublicSet;
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
  high90Usd: number | null;
  firstSeen: Date;
}

export interface PublicSealed extends PublicLows, PublicStores {
  id: number;
  slug: string;
  name: string;
  setId: number | null;
  set: PublicSet | null;
  kind: string;
  packCount: number | null;
  imageUrl: string | null;
  tcgplayerUrl: string;
  releasedOn: Date | null;
  presale: boolean;
  marketUsd: number | null;
  change7d: number | null;
}

export interface PublicOffer {
  productId: number;
  source: string;
  market: string;
  priceCents: number;
  currency: string;
  url: string;
  inStock: boolean;
  condition: string | null;
  title: string | null;
  shippingCents: number | null;
  updatedAt: Date;
}

export interface PublicCatalog {
  sets: PublicSet[];
  cards: PublicCard[];
  sealed: PublicSealed[];
  generatedAt: string | null;
}

type CoreFile = { cards: CoreTuple[]; sets: (Omit<PublicSet, "releasedOn" | "tcgName"> & { releasedOn: string | null; tcgName?: string })[] };
type PricesFile = { ids: number[]; prices: PriceTuple[] };

const lowsOf = (low: (number | null)[] | 0 | undefined): PublicLows => {
  const l = low === 0 || low == null ? [null, null, null, null, null, null] : low;
  return { lowUS: l[0] ?? null, lowAU: l[1] ?? null, lowUK: l[2] ?? null, lowSG: l[3] ?? null, lowCA: l[4] ?? null, lowEU: l[5] ?? null };
};
const storesOf = (st: number[] | 0 | undefined): PublicStores => {
  const s = st === 0 || st == null ? [0, 0, 0, 0, 0, 0] : st;
  return { storesUS: s[0] ?? 0, storesAU: s[1] ?? 0, storesUK: s[2] ?? 0, storesSG: s[3] ?? 0, storesCA: s[4] ?? 0, storesEU: s[5] ?? 0 };
};

let built: { core: object; value: PublicCatalog } | null = null;

/** The catalogue as rows (sets, cards, sealed) from the snapshot's files. Throws when the snapshot cannot be read. */
export async function publicCatalog(): Promise<PublicCatalog> {
  const [meta, core, prices, cards, sealed] = await Promise.all([
    snapshotFile<SnapshotMeta>("meta.json"),
    snapshotFile<CoreFile>("core.json.gz"),
    snapshotFile<PricesFile>("prices.json.gz"),
    snapshotFile<Record<string, SnapshotCard>>("cards.json.gz"),
    snapshotFile<SealedLite[]>("sealed.json.gz"),
  ]);
  if (!core || !prices || !cards || !sealed) throw new Error("the price snapshot could not be read (core, prices, cards or sealed is missing)");
  if (built && built.core === core) return built.value;
  const sets: PublicSet[] = core.sets.map((s) => ({ ...s, tcgName: s.tcgName ?? "", releasedOn: s.releasedOn ? new Date(s.releasedOn) : null }));
  const setById = new Map(sets.map((s) => [s.id, s]));
  const price = new Map<number, PriceTuple>();
  prices.ids.forEach((id, i) => price.set(id, prices.prices[i]));
  const cardRows: PublicCard[] = Object.values(cards)
    .map((c) => {
      const p = price.get(c.id);
      const { setId, firstSeen, ...rest } = c;
      return {
        ...rest,
        setId,
        set: setById.get(setId) ?? { id: setId, slug: "", code: "", name: "", tcgName: "", kind: "", releasedOn: null, cardCount: 0, sealedCount: 0 },
        ...lowsOf(p?.[1]),
        ...storesOf(p?.[2]),
        change7d: p?.[3] ?? c.change7d,
        change30d: p?.[4] ?? c.change30d,
        high90Usd: p?.[5] ?? null,
        firstSeen: firstSeen ? new Date(firstSeen) : new Date(0),
      } as PublicCard;
    })
    .sort((a, b) => a.id - b.id);
  const sealedRows: PublicSealed[] = sealed.map((s) => ({
    id: s.id, slug: s.slug, name: s.name, setId: s.setId, set: s.setId != null ? setById.get(s.setId) ?? null : null, kind: s.kind, packCount: s.packCount,
    imageUrl: s.imageUrl, tcgplayerUrl: s.tcgplayerUrl, releasedOn: s.releasedOn ? new Date(s.releasedOn) : null, presale: s.presale, marketUsd: s.marketUsd, change7d: s.change7d,
    ...lowsOf(MARKETS.map((m) => s.low[m])),
    ...storesOf(MARKETS.map((m) => s.stores[m])),
  }));
  const value = { sets, cards: cardRows, sealed: sealedRows, generatedAt: meta?.generatedAt ?? null };
  built = { core, value };
  return value;
}

type OfferShard = Record<string, OfferRow[]>;

/**
 * The offers of some products, as rows, or of EVERY product when `ids` is not
 * given (a job that scans the market; reads all ~200 range files). Reads the
 * range files, or the legacy shards of a snapshot written before them.
 */
export async function publicOffers(ids?: Iterable<number>): Promise<PublicOffer[]> {
  const want = ids ? new Set(ids) : null;
  const meta = await snapshotFile<SnapshotMeta>("meta.json");
  const toRow = (productId: number, o: OfferRow): PublicOffer => ({
    productId, source: o.source, market: o.market, priceCents: o.priceCents, currency: o.currency, url: o.url, inStock: o.inStock,
    condition: o.condition, title: null, shippingCents: o.shippingCents, updatedAt: new Date(o.updatedAt),
  });
  const out: PublicOffer[] = [];
  const take = (shard: OfferShard | null) => {
    if (!shard) return;
    for (const [pid, rows] of Object.entries(shard)) {
      const id = Number(pid);
      if (want && !want.has(id)) continue;
      for (const o of rows) out.push(toRow(id, o));
    }
  };
  if (meta?.ranges?.length) {
    const files = want ? [...new Set([...want].map((id) => rangeFile(id)))] : meta.ranges.map((r) => `o/${r}.json.gz`);
    for (const f of files) take(await snapshotFile<OfferShard>(f));
  } else if (want) {
    for (const f of new Set([...want].map((id) => `offers/${shardOf(id)}.json.gz`))) take(await snapshotFile<OfferShard>(f));
  } else {
    for (let i = 0; i < 64; i++) take(await snapshotFile<OfferShard>(`offers/${String(i).padStart(2, "0")}.json.gz`));
  }
  void RANGE_SIZE;
  return out;
}

/** The eBay pass's memory: when each (product, market) was last searched. */
export const publicEbayChecks = async (): Promise<EbayCheckTuple[]> => (await snapshotFile<EbayCheckTuple[]>("ebay-checks.json.gz")) ?? [];
