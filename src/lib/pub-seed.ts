// Fills the public working copy (lib/pubdb.ts) at the start of a job.
//
//   seedFromSnapshot  the normal path: the `snapshot` branch on GitHub is the only
//                     persistent copy of the public data, so every job that needs
//                     it (the import, the eBay pass, the newsletter) starts here.
//   seedFromNeon      the ONE-TIME bootstrap (scripts/pub-bootstrap.ts): copies the
//                     tables out of the old Neon database so the first snapshot of
//                     the new design loses nothing (the eBay pass's memory of what
//                     it searched, panel titles, change7d/30d).
//
// Both leave the working copy exactly as the import and the eBay pass expect to
// find it. Script-side only.
import { pub } from "./pubdb";
import { stripLoneSurrogates } from "./listing-panel";
import { snapshotFile, SNAPSHOT_SHARDS, type SnapshotMeta } from "./price-snapshot";
import { rangeFile } from "./price-snapshot";
import type { SnapshotCard, SnapshotEbay, EbayCheckTuple } from "./price-snapshot-build";
import type { CoreTuple, OfferRow, PriceTuple, SealedLite, SetLite } from "./data";

type Log = (...a: unknown[]) => void;
const CHUNK = 5000;

async function insertAll<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

export interface SeedResult {
  sets: number;
  cards: number;
  sealed: number;
  offers: number;
  ebayChecks: number;
  ebayListings: number;
  generatedAt: string | null;
}

/** Is the working copy empty (nothing seeded yet)? */
export async function isSeeded(): Promise<boolean> {
  return (await pub.card.count()) > 0;
}

export async function seedFromSnapshot(log: Log = () => {}): Promise<SeedResult> {
  const meta = await snapshotFile<SnapshotMeta>("meta.json");
  if (!meta) throw new Error("the snapshot has no meta.json: nothing to seed from (run scripts/pub-bootstrap.ts once, or check SNAPSHOT_RAW_BASE / SNAPSHOT_LOCAL_DIR)");
  const [core, prices, cards, sealed] = await Promise.all([
    snapshotFile<{ cards: CoreTuple[]; sets: (SetLite & { tcgName?: string })[] }>("core.json.gz"),
    snapshotFile<{ ids: number[]; prices: PriceTuple[] }>("prices.json.gz"),
    snapshotFile<Record<string, SnapshotCard>>("cards.json.gz"),
    snapshotFile<SealedLite[]>("sealed.json.gz"),
  ]);
  if (!core || !prices || !cards || !sealed) throw new Error("the snapshot is missing core, prices, cards or sealed: refusing to seed from it");

  await pub.$transaction([pub.offer.deleteMany(), pub.ebayListing.deleteMany(), pub.ebayGradedListing.deleteMany(), pub.ebayCheck.deleteMany(), pub.card.deleteMany(), pub.sealed.deleteMany(), pub.set.deleteMany()]);

  await pub.set.createMany({
    data: core.sets.map((s) => ({ id: s.id, slug: s.slug, code: s.code, name: s.name, tcgName: s.tcgName ?? "", kind: s.kind, releasedOn: s.releasedOn ? new Date(s.releasedOn) : null, cardCount: s.cardCount, sealedCount: s.sealedCount })),
  });

  const price = new Map<number, PriceTuple>();
  prices.ids.forEach((id, i) => price.set(id, prices.prices[i]));
  const cardRows = Object.values(cards).map((c) => {
    const p = price.get(c.id);
    const low = p && p[1] !== 0 ? p[1] : [null, null, null, null, null, null];
    const st = p && p[2] !== 0 ? p[2] : [0, 0, 0, 0, 0, 0];
    return {
      id: c.id, slug: c.slug, name: c.name, tcgName: c.tcgName, number: c.number, setId: c.setId, rarity: c.rarity, variant: c.variant, printing: c.printing,
      colors: c.colors, cardType: c.cardType, cost: c.cost, power: c.power, counter: c.counter, life: c.life, attribute: c.attribute, subtypes: c.subtypes,
      effect: c.effect, finish: c.finish, hasImage: c.hasImage, tcgplayerUrl: c.tcgplayerUrl, marketUsd: c.marketUsd,
      lowUS: low[0], lowAU: low[1], lowUK: low[2], lowSG: low[3], lowCA: low[4], lowEU: low[5],
      storesUS: st[0] ?? 0, storesAU: st[1] ?? 0, storesUK: st[2] ?? 0, storesSG: st[3] ?? 0, storesCA: st[4] ?? 0, storesEU: st[5] ?? 0,
      change7d: p?.[3] ?? null, change30d: p?.[4] ?? null, high90Usd: p?.[5] ?? null,
      ...(c.firstSeen ? { firstSeen: new Date(c.firstSeen) } : {}),
    };
  });
  await insertAll(cardRows, (data) => pub.card.createMany({ data }));
  await insertAll(sealed, (rows) =>
    pub.sealed.createMany({
      data: rows.map((s) => ({
        id: s.id, slug: s.slug, name: s.name, setId: s.setId, kind: s.kind, packCount: s.packCount, imageUrl: s.imageUrl, tcgplayerUrl: s.tcgplayerUrl,
        releasedOn: s.releasedOn ? new Date(s.releasedOn) : null, presale: s.presale, marketUsd: s.marketUsd, change7d: s.change7d,
        lowUS: s.low.US, lowAU: s.low.AU, lowUK: s.low.UK, lowSG: s.low.SG, lowCA: s.low.CA, lowEU: s.low.EU,
        storesUS: s.stores.US, storesAU: s.stores.AU, storesUK: s.stores.UK, storesSG: s.stores.SG, storesCA: s.stores.CA, storesEU: s.stores.EU,
      })),
    }),
  );

  // Offers: the range files when the snapshot has them, else the legacy shards.
  let offers = 0;
  const addOffers = async (shard: Record<string, OfferRow[]> | null) => {
    if (!shard) return;
    const data = Object.entries(shard).flatMap(([pid, rows]) =>
      rows.map((o) => ({ productId: Number(pid), source: o.source, market: o.market, priceCents: o.priceCents, currency: o.currency, url: o.url, inStock: o.inStock, condition: o.condition, shippingCents: o.shippingCents, updatedAt: new Date(o.updatedAt) })),
    );
    offers += data.length;
    await insertAll(data, (d) => pub.offer.createMany({ data: d, skipDuplicates: true }));
  };
  if (meta.ranges?.length) {
    for (const r of meta.ranges) await addOffers(await snapshotFile<Record<string, OfferRow[]>>(rangeFile(Number(r) * 1024)));
  } else {
    for (let i = 0; i < SNAPSHOT_SHARDS; i++) await addOffers(await snapshotFile<Record<string, OfferRow[]>>(`offers/${String(i).padStart(2, "0")}.json.gz`));
  }

  // The eBay pass's memory, and the listings panels with their real capture times.
  const checks = (await snapshotFile<EbayCheckTuple[]>("ebay-checks.json.gz")) ?? [];
  await insertAll(checks, (rows) => pub.ebayCheck.createMany({ data: rows.map(([productId, market, at, matched]) => ({ productId, market, checkedAt: new Date(at), matched: matched === 1 })), skipDuplicates: true }));
  const ebay = await snapshotFile<SnapshotEbay>("ebay.json.gz");
  const fallbackAt = new Date(meta.generatedAt);
  const listingRows = Object.entries(ebay?.listings ?? {}).flatMap(([pid, rows]) => rows.map((l) => ({ productId: Number(pid), market: l.market, rank: l.rank, priceCents: l.priceCents, shippingCents: l.shippingCents, currency: l.currency, url: l.url, title: stripLoneSurrogates(l.title), imageUrl: l.imageUrl, updatedAt: l.u ? new Date(l.u) : fallbackAt })));
  await insertAll(listingRows, (data) => pub.ebayListing.createMany({ data, skipDuplicates: true }));
  const gradedRows = Object.entries(ebay?.graded ?? {}).flatMap(([pid, rows]) => rows.map((g) => ({ productId: Number(pid), market: g.market, itemId: g.itemId, priceCents: g.priceCents, shippingCents: g.shippingCents, currency: g.currency, url: g.url, title: stripLoneSurrogates(g.title), imageUrl: g.imageUrl, grader: g.grader, grade: g.grade, updatedAt: g.u ? new Date(g.u) : fallbackAt })));
  await insertAll(gradedRows, (data) => pub.ebayGradedListing.createMany({ data, skipDuplicates: true }));

  const out = { sets: core.sets.length, cards: cardRows.length, sealed: sealed.length, offers, ebayChecks: checks.length, ebayListings: listingRows.length, generatedAt: meta.generatedAt };
  log(`Seeded the working copy from the snapshot of ${meta.generatedAt}: ${out.sets} sets, ${out.cards} cards, ${out.sealed} sealed, ${out.offers} offers, ${out.ebayChecks} eBay checks, ${out.ebayListings} eBay listings`);
  return out;
}

/** The slice of the Neon client the bootstrap reads through (raw SQL only: the models are gone from its schema). */
export interface NeonReader {
  $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
}

/** One-time: copy the public tables out of Neon into the working copy. */
export async function seedFromNeon(neon: NeonReader, log: Log = () => {}): Promise<SeedResult> {
  await pub.$transaction([pub.offer.deleteMany(), pub.ebayListing.deleteMany(), pub.ebayGradedListing.deleteMany(), pub.ebayCheck.deleteMany(), pub.card.deleteMany(), pub.sealed.deleteMany(), pub.set.deleteMany()]);
  const all = <T,>(table: string, order: string) => neon.$queryRawUnsafe<T[]>(`SELECT * FROM "${table}" ORDER BY ${order}`);
  const pick = <T extends Record<string, unknown>>(row: T, keys: string[]) => Object.fromEntries(keys.map((k) => [k, row[k]]));

  const sets = await all<Record<string, unknown>>("Set", "id");
  await pub.set.createMany({ data: sets.map((r) => pick(r, ["id", "slug", "code", "name", "tcgName", "kind", "releasedOn", "cardCount", "sealedCount"])) as never });
  const CARD = ["id", "slug", "name", "tcgName", "number", "setId", "rarity", "variant", "printing", "colors", "cardType", "cost", "power", "counter", "life", "attribute", "subtypes", "effect", "finish", "hasImage", "tcgplayerUrl", "marketUsd", "lowUS", "lowAU", "lowUK", "lowSG", "lowCA", "lowEU", "storesUS", "storesAU", "storesUK", "storesSG", "storesCA", "storesEU", "change7d", "change30d", "high90Usd", "firstSeen"];
  const cards = await all<Record<string, unknown>>("Card", "id");
  await insertAll(cards, (rows) => pub.card.createMany({ data: rows.map((r) => pick(r, CARD)) as never }));
  const SEALED = ["id", "slug", "name", "setId", "kind", "packCount", "imageUrl", "tcgplayerUrl", "releasedOn", "presale", "marketUsd", "lowUS", "lowAU", "lowUK", "lowSG", "lowCA", "lowEU", "storesUS", "storesAU", "storesUK", "storesSG", "storesCA", "storesEU", "change7d", "firstSeen"];
  const sealed = await all<Record<string, unknown>>("Sealed", "id");
  await insertAll(sealed, (rows) => pub.sealed.createMany({ data: rows.map((r) => pick(r, SEALED)) as never }));
  const OFFER = ["productId", "source", "market", "priceCents", "currency", "url", "inStock", "condition", "title", "shippingCents", "updatedAt"];
  // 650,000 rows: paged, so the runner never holds them all (and Neon serves them in 20,000-row reads).
  let offers = 0;
  for (let at = 0; ; at += 20000) {
    const page = await neon.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "Offer" ORDER BY "productId", source, market LIMIT 20000 OFFSET ${at}`);
    if (!page.length) break;
    offers += page.length;
    await insertAll(page, (rows) => pub.offer.createMany({ data: rows.map((r) => pick(r, OFFER)) as never, skipDuplicates: true }));
  }
  const checks = await all<Record<string, unknown>>("EbayCheck", `"productId", market`);
  await insertAll(checks, (rows) => pub.ebayCheck.createMany({ data: rows.map((r) => pick(r, ["productId", "market", "checkedAt", "matched"])) as never }));
  const LISTING = ["productId", "market", "rank", "priceCents", "shippingCents", "currency", "url", "title", "imageUrl", "updatedAt"];
  const listings = await all<Record<string, unknown>>("EbayListing", `"productId", market, rank`);
  await insertAll(listings, (rows) => pub.ebayListing.createMany({ data: rows.map((r) => pick(r, LISTING)) as never }));
  const GRADED = ["productId", "market", "itemId", "priceCents", "shippingCents", "currency", "url", "title", "imageUrl", "grader", "grade", "updatedAt"];
  const graded = await all<Record<string, unknown>>("EbayGradedListing", `"productId", market, "itemId"`);
  await insertAll(graded, (rows) => pub.ebayGradedListing.createMany({ data: rows.map((r) => pick(r, GRADED)) as never, skipDuplicates: true }));
  const out = { sets: sets.length, cards: cards.length, sealed: sealed.length, offers, ebayChecks: checks.length, ebayListings: listings.length, generatedAt: null };
  log(`Copied from Neon: ${out.sets} sets, ${out.cards} cards, ${out.sealed} sealed, ${out.offers} offers, ${out.ebayChecks} eBay checks, ${out.ebayListings} eBay listings, ${graded.length} slabs`);
  return out;
}
