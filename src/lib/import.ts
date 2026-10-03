// The import: TCGplayer catalogue + prices (TCGCSV), store offers, per-market
// aggregates, daily history and the index. Run by scripts/import.ts from
// .github/workflows/import-prices.yml twice a day. Writes ONLY to DATABASE_URL.
//
// NO eBay API calls — see lib/affiliate.ts. eBay appears on the site only as a
// search link we build ourselves.
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  TCGCSV_BASE,
  assignSlugs,
  foldNameAliases,
  isSealedProduct,
  parseCard,
  parseSealed,
  pickPrice,
  setCode,
  setDisplayName,
  setKind,
  setSlug,
  type CatalogCard,
  type CatalogSealed,
  type TcgcsvGroup,
  type TcgcsvPrice,
  type TcgcsvProduct,
} from "./catalog";
import { MARKETS, currencyOf, type Country } from "./country";
import { toUsdCents } from "./fx";
import {
  anyVariant,
  bestVariant,
  buildCardIndex,
  conditionRank,
  buildNameIndex,
  matchByName,
  matchCardTitle,
  matchSealedTitle,
  plausibleSealedPrice,
  plausibleSinglePrice,
  type SealedRef,
} from "./match";
import { STORES, type StoreInfo } from "./stores";
import { fetchStoreProducts, productUrl } from "./store-import";
import { SITE_URL } from "./site";

type Log = (...a: unknown[]) => void;

const UA = { "User-Agent": `OPCompare/1.0 (+${SITE_URL})`, Accept: "application/json" };

// ── TCGCSV ───────────────────────────────────────────────────────────────────
async function tcgcsv<T>(pathPart: string, cacheDir?: string): Promise<T> {
  const file = cacheDir ? path.join(cacheDir, `${pathPart.replace(/\//g, "_")}.json`) : null;
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${TCGCSV_BASE}/${pathPart}`, { headers: UA, cache: "no-store" });
      if (!res.ok) throw new Error(`TCGCSV ${pathPart}: HTTP ${res.status}`);
      const text = await res.text();
      if (file) fs.writeFileSync(file, text);
      return JSON.parse(text) as T;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

// ── Bulk upsert ──────────────────────────────────────────────────────────────
type Col = { name: string; cast?: string };

async function upsert(table: string, cols: Col[], rows: unknown[][], conflict: string, update: string[]): Promise<void> {
  const CHUNK = Math.max(1, Math.floor(30000 / cols.length));
  for (let s = 0; s < rows.length; s += CHUNK) {
    const chunk = rows.slice(s, s + CHUNK);
    const params: unknown[] = [];
    const values = chunk.map(
      (r) =>
        "(" +
        r
          .map((v, i) => {
            params.push(v);
            return `$${params.length}${cols[i].cast ? `::${cols[i].cast}` : ""}`;
          })
          .join(",") +
        ")",
    );
    const sql =
      `INSERT INTO "${table}" (${cols.map((c) => `"${c.name}"`).join(",")}) VALUES ${values.join(",")} ` +
      `ON CONFLICT ("${conflict}") DO UPDATE SET ${update.map((u) => `"${u}"=EXCLUDED."${u}"`).join(",")}`;
    await prisma.$executeRawUnsafe(sql, ...params);
  }
}

// ── Catalogue ────────────────────────────────────────────────────────────────
export interface CatalogResult {
  sets: number;
  cards: number;
  sealed: number;
  tcgplayerOffers: number;
  cardMarket: Map<number, number | null>;
}

export async function importCatalog(log: Log, cacheDir?: string): Promise<CatalogResult> {
  const groups = (await tcgcsv<{ results: TcgcsvGroup[] }>("groups", cacheDir)).results;
  log(`TCGCSV: ${groups.length} One Piece groups`);
  const data = await pool(groups, 4, async (g) => {
    const [p, pr] = await Promise.all([
      tcgcsv<{ results: TcgcsvProduct[] }>(`${g.groupId}/products`, cacheDir),
      tcgcsv<{ results: TcgcsvPrice[] }>(`${g.groupId}/prices`, cacheDir),
    ]);
    return { g, products: p.results ?? [], prices: pr.results ?? [] };
  });

  const cards: (CatalogCard & { low: number | null; market: number | null; finish: string | null })[] = [];
  const sealed: (CatalogSealed & { low: number | null; market: number | null })[] = [];
  const setRows: unknown[][] = [];
  const now = new Date();
  const seen = new Set<number>();
  const setSlugs = new Set<string>();

  for (const { g, products, prices } of data) {
    const kind = setKind(g);
    const code = setCode(g);
    const byId = new Map<number, TcgcsvPrice[]>();
    for (const r of prices) (byId.get(r.productId) ?? byId.set(r.productId, []).get(r.productId)!).push(r);
    let nCards = 0;
    let nSealed = 0;
    for (const p of products) {
      if (seen.has(p.productId)) continue;
      seen.add(p.productId);
      const pr = pickPrice(byId.get(p.productId) ?? []);
      if (isSealedProduct(p)) {
        const s = parseSealed(p, kind, true);
        if (!s) continue;
        sealed.push({ ...s, low: pr.lowCents, market: pr.marketCents });
        nSealed++;
      } else {
        const c = parseCard(p, code, g);
        cards.push({ ...c, low: pr.lowCents, market: pr.marketCents, finish: pr.finish });
        nCards++;
      }
    }
    let slug = setSlug(g);
    if (setSlugs.has(slug)) slug = `${slug}-${g.groupId}`;
    setSlugs.add(slug);
    setRows.push([
      g.groupId,
      slug,
      code,
      setDisplayName(g),
      g.name,
      kind,
      g.publishedOn ? new Date(g.publishedOn.slice(0, 10)) : null,
      nCards,
      nSealed,
      now,
    ]);
  }

  // Sets first (cards reference them).
  await upsert(
    "Set",
    [{ name: "id" }, { name: "slug" }, { name: "code" }, { name: "name" }, { name: "tcgName" }, { name: "kind" }, { name: "releasedOn", cast: "timestamp(3)" }, { name: "cardCount", cast: "int" }, { name: "sealedCount", cast: "int" }, { name: "updatedAt", cast: "timestamp(3)" }],
    setRows,
    "id",
    ["code", "name", "tcgName", "kind", "releasedOn", "cardCount", "sealedCount", "updatedAt"],
  );

  const codeBySet = new Map(data.map(({ g }) => [g.groupId, setCode(g)] as const));
  foldNameAliases(cards, (id) => codeBySet.get(id) ?? "");
  const existingCardSlugs = new Map((await prisma.card.findMany({ select: { id: true, slug: true } })).map((r) => [r.id, r.slug]));
  const cardSlugs = assignSlugs(cards, existingCardSlugs);
  await upsert(
    "Card",
    [
      { name: "id" }, { name: "slug" }, { name: "name" }, { name: "tcgName" }, { name: "number" }, { name: "setId" },
      { name: "rarity" }, { name: "variant" }, { name: "printing" }, { name: "colors", cast: "text[]" }, { name: "cardType" },
      { name: "cost", cast: "int" }, { name: "power", cast: "int" }, { name: "counter", cast: "int" }, { name: "life", cast: "int" },
      { name: "attribute" }, { name: "subtypes", cast: "text[]" }, { name: "effect" }, { name: "finish" }, { name: "hasImage", cast: "boolean" },
      { name: "tcgplayerUrl" }, { name: "marketUsd", cast: "int" }, { name: "updatedAt", cast: "timestamp(3)" },
    ],
    cards.map((c) => [
      c.id, cardSlugs.get(c.id)!, c.name, c.tcgName, c.number, c.setId, c.rarity, c.variant, c.printing, c.colors, c.cardType,
      c.cost, c.power, c.counter, c.life, c.attribute, c.subtypes, c.effect, c.finish, c.hasImage, c.tcgplayerUrl, c.market, now,
    ]),
    "id",
    ["name", "tcgName", "number", "setId", "rarity", "variant", "printing", "colors", "cardType", "cost", "power", "counter", "life", "attribute", "subtypes", "effect", "finish", "hasImage", "tcgplayerUrl", "marketUsd", "updatedAt"],
  );

  const existingSealedSlugs = new Map((await prisma.sealed.findMany({ select: { id: true, slug: true } })).map((r) => [r.id, r.slug]));
  const sealedSlugs = assignSlugs(sealed, existingSealedSlugs);
  await upsert(
    "Sealed",
    [
      { name: "id" }, { name: "slug" }, { name: "name" }, { name: "setId" }, { name: "kind" }, { name: "packCount", cast: "int" },
      { name: "imageUrl" }, { name: "tcgplayerUrl" }, { name: "releasedOn", cast: "timestamp(3)" }, { name: "presale", cast: "boolean" },
      { name: "marketUsd", cast: "int" }, { name: "updatedAt", cast: "timestamp(3)" },
    ],
    sealed.map((s) => [
      s.id, sealedSlugs.get(s.id)!, s.name, s.setId, s.kind, s.packCount, s.imageUrl, s.tcgplayerUrl,
      s.releasedOn ? new Date(s.releasedOn) : null, s.presale, s.market, now,
    ]),
    "id",
    ["name", "setId", "kind", "packCount", "imageUrl", "tcgplayerUrl", "releasedOn", "presale", "marketUsd", "updatedAt"],
  );

  // TCGplayer's cheapest listing is the US market's TCGplayer offer. Replaced
  // wholesale: a product with no listing today has no row today.
  const tcgRows = [
    ...cards.filter((c) => c.low != null).map((c) => ({ productId: c.id, priceCents: c.low!, url: c.tcgplayerUrl })),
    ...sealed.filter((s) => s.low != null).map((s) => ({ productId: s.id, priceCents: s.low!, url: s.tcgplayerUrl })),
  ];
  await prisma.$transaction([
    prisma.offer.deleteMany({ where: { source: "tcgplayer" } }),
    prisma.offer.createMany({
      data: tcgRows.map((r) => ({
        productId: r.productId,
        source: "tcgplayer",
        market: "US",
        priceCents: r.priceCents,
        currency: "USD",
        url: r.url,
        inStock: true,
        condition: null,
        title: null,
        updatedAt: now,
      })),
    }),
  ]);

  const cardMarket = new Map<number, number | null>();
  for (const c of cards) cardMarket.set(c.id, c.market);
  for (const s of sealed) cardMarket.set(s.id, s.market);
  log(`Catalogue: ${setRows.length} sets, ${cards.length} cards, ${sealed.length} sealed; ${tcgRows.length} TCGplayer listings`);
  return { sets: setRows.length, cards: cards.length, sealed: sealed.length, tcgplayerOffers: tcgRows.length, cardMarket };
}

// ── Stores ───────────────────────────────────────────────────────────────────
export interface StoreResult {
  key: string;
  country: Country;
  products: number;
  cards: number;
  sealed: number;
  inStock: number;
  failed: boolean;
  skipped?: string;
  misses: Record<string, number>;
}

interface OfferDraft {
  productId: number;
  priceCents: number;
  inStock: boolean;
  condition: string | null;
  title: string;
  url: string;
}

function better(a: OfferDraft, b: OfferDraft): OfferDraft {
  if (a.inStock !== b.inStock) return a.inStock ? a : b;
  const ra = conditionRank(a.condition ?? "");
  const rb = conditionRank(b.condition ?? "");
  if (ra !== rb) return ra < rb ? a : b;
  return a.priceCents <= b.priceCents ? a : b;
}

export async function importStores(log: Log, opts: { only?: string[]; market?: Country } = {}): Promise<StoreResult[]> {
  const cards = await prisma.card.findMany({
    where: { number: { not: null } },
    select: { id: true, name: true, tcgName: true, number: true, variant: true, marketUsd: true, set: { select: { code: true, name: true, tcgName: true } } },
  });
  const idx = buildCardIndex(cards.map((c) => ({ ...c, setCode: c.set.code, setName: c.set.name })));
  // DON!! cards have no number; they are reachable by the name path only.
  const dons = await prisma.card.findMany({ where: { number: null }, select: { id: true, tcgName: true, marketUsd: true, set: { select: { name: true, tcgName: true } } } });
  const nameIdx = buildNameIndex([...cards, ...dons].map((c) => ({ id: c.id, tcgName: c.tcgName, setNames: [c.set.name, c.set.tcgName] })));
  for (const d of dons) cards.push({ ...d, name: "DON!! Card", number: null, variant: null, set: { code: "", name: d.set.name, tcgName: d.set.tcgName } });
  const sealedRows = await prisma.sealed.findMany({ select: { id: true, name: true, kind: true, marketUsd: true, set: { select: { code: true, name: true } } } });
  const sealedRefs: SealedRef[] = sealedRows.map((s) => ({ id: s.id, name: s.name, kind: s.kind as SealedRef["kind"], setCode: s.set?.code ?? null, setName: s.set?.name ?? null }));
  const market = new Map<number, number | null>([...cards.map((c) => [c.id, c.marketUsd] as const), ...sealedRows.map((s) => [s.id, s.marketUsd] as const)]);
  const isSealed = new Set(sealedRows.map((s) => s.id));

  let stores: StoreInfo[] = STORES;
  if (opts.only?.length) stores = stores.filter((s) => opts.only!.includes(s.key));
  if (opts.market) stores = stores.filter((s) => s.country === opts.market);

  return pool(stores, 8, async (store): Promise<StoreResult> => {
    const res: StoreResult = { key: store.key, country: store.country, products: 0, cards: 0, sealed: 0, inStock: 0, failed: false, misses: {} };
    // A store configured to charge in another currency cannot be priced in this
    // market (RiftCompare's offer-currency rule).
    const cur = currencyOf(store.country);
    if (store.currency && store.currency !== cur) {
      res.skipped = `charges ${store.currency}, market is ${cur}`;
      return res;
    }
    let fetched;
    try {
      fetched = await fetchStoreProducts(store);
    } catch (e) {
      fetched = { products: [], failed: true, handles: [] };
      log(`  ⚠ ${store.name}: ${(e as Error).message}`);
    }
    res.products = fetched.products.length;
    if (fetched.failed) {
      res.failed = true;
      log(`  ⚠ ${store.name} (${store.country}): a configured collection could not be read — keeping its existing rows.`);
      return res;
    }
    const drafts = new Map<number, OfferDraft>();
    for (const p of fetched.products) {
      let id: number | null = null;
      const m = matchCardTitle(p.title, idx);
      const byName = "id" in m ? null : matchByName(p.title, nameIdx);
      if ("id" in m) id = m.id;
      else if (byName != null) id = byName;
      else {
        const s = matchSealedTitle(p.title, sealedRefs);
        if ("id" in s) id = s.id;
        else res.misses[m.miss] = (res.misses[m.miss] ?? 0) + 1;
      }
      if (id == null) continue;
      const best = bestVariant(p.variants ?? []);
      const price = best?.priceCents ?? anyVariant(p.variants ?? []);
      if (price == null) continue;
      const usdCents = toUsdCents(price, cur);
      const mk = market.get(id) ?? null;
      const ok = isSealed.has(id) ? plausibleSealedPrice(usdCents, mk) : plausibleSinglePrice(usdCents, mk);
      if (!ok) {
        res.misses["implausible-price"] = (res.misses["implausible-price"] ?? 0) + 1;
        continue;
      }
      const d: OfferDraft = { productId: id, priceCents: price, inStock: Boolean(best), condition: isSealed.has(id) ? null : best?.condition ?? null, title: p.title.slice(0, 300), url: productUrl(store, p) };
      const prev = drafts.get(id);
      drafts.set(id, prev ? better(prev, d) : d);
    }
    const now = new Date();
    const source = `store:${store.key}`;
    const rows = [...drafts.values()];
    await prisma.$transaction([
      prisma.offer.deleteMany({ where: { source, market: store.country } }),
      prisma.offer.createMany({
        data: rows.map((r) => ({ ...r, source, market: store.country, currency: cur, updatedAt: now })),
      }),
    ]);
    res.cards = rows.filter((r) => !isSealed.has(r.productId)).length;
    res.sealed = rows.filter((r) => isSealed.has(r.productId)).length;
    res.inStock = rows.filter((r) => r.inStock).length;
    log(`  ${store.country} ${store.name}: ${res.products} products → ${res.cards} cards, ${res.sealed} sealed (${res.inStock} in stock)`);
    return res;
  });
}

// ── Aggregates, history, index ───────────────────────────────────────────────
/** An offer not refreshed for this long no longer counts as in stock (RiftCompare's 72h rule). */
export const STALE_HOURS = 72;

export async function aggregate(log: Log): Promise<void> {
  // A store removed from the registry leaves no rows behind.
  const known = STORES.map((s) => `store:${s.key}`);
  const removed = await prisma.offer.deleteMany({ where: { source: { startsWith: "store:", notIn: known } } });
  if (removed.count) log(`Removed ${removed.count} offers from stores no longer in the registry`);
  for (const table of ["Card", "Sealed"]) {
    const reset = MARKETS.map((m) => `"low${m}" = NULL, "stores${m}" = 0`).join(", ");
    await prisma.$executeRawUnsafe(`UPDATE "${table}" SET ${reset}`);
    for (const m of MARKETS) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" t SET "low${m}" = a.low, "stores${m}" = a.n
         FROM (SELECT "productId", MIN("priceCents") AS low, COUNT(*)::int AS n FROM "Offer"
               WHERE market = $1 AND "inStock" AND "updatedAt" > now() - make_interval(hours => $2::int) GROUP BY "productId") a
         WHERE a."productId" = t.id`,
        m,
        STALE_HOURS,
      );
    }
  }
  log("Aggregated per-market lowest prices");
}

export async function recordHistory(log: Log, today: Date = utcDay()): Promise<void> {
  for (const table of ["Card", "Sealed"]) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PriceDay" ("productId", day, "marketUsd", "lowUsd")
       SELECT id, $1::date, "marketUsd", "lowUS" FROM "${table}" WHERE "marketUsd" IS NOT NULL OR "lowUS" IS NOT NULL
       ON CONFLICT ("productId", day) DO UPDATE SET "marketUsd" = EXCLUDED."marketUsd", "lowUsd" = EXCLUDED."lowUsd"`,
      today,
    );
    const windows: [string, number][] = table === "Card" ? [["change7d", 7], ["change30d", 30]] : [["change7d", 7]];
    for (const [col, days] of windows) {
      await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "${col}" = NULL`);
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" t SET "${col}" = ROUND(((t."marketUsd" - p."marketUsd") * 100.0 / p."marketUsd")::numeric, 1)
         FROM (SELECT DISTINCT ON ("productId") "productId", "marketUsd" FROM "PriceDay"
               WHERE day <= $1::date - $2::int AND day >= $1::date - ($2::int + 4) AND "marketUsd" > 0
               ORDER BY "productId", day DESC) p
         WHERE p."productId" = t.id AND t."marketUsd" IS NOT NULL`,
        today,
        days,
      );
    }
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" t SET "high90Usd" = h.hi FROM (SELECT "productId", MAX("marketUsd") AS hi FROM "PriceDay"
      WHERE day >= $1::date - 90 GROUP BY "productId") h WHERE h."productId" = t.id`,
    today,
  );
  log("Recorded today's price history and 7/30-day changes");
}

/**
 * The OP Compare Index: a chained, value-weighted index of every single priced
 * at US$1+ on TCGplayer on two consecutive recorded days. 1,000 on the first
 * day; each day moves it by Σ today / Σ previous day over the cards priced on
 * both, so a new set's cards join without jolting it.
 */
export async function recordIndex(log: Log, today: Date = utcDay()): Promise<void> {
  const prev = await prisma.indexDay.findFirst({ where: { day: { lt: today } }, orderBy: { day: "desc" } });
  const totals = await prisma.$queryRaw<{ total: bigint | null; n: bigint }[]>(
    Prisma.sql`SELECT SUM(d."marketUsd")::bigint AS total, COUNT(*)::bigint AS n FROM "PriceDay" d JOIN "Card" c ON c.id = d."productId"
               WHERE d.day = ${today}::date AND d."marketUsd" >= 100`,
  );
  const total = Number(totals[0]?.total ?? 0);
  const n = Number(totals[0]?.n ?? 0);
  let value = 1000;
  if (prev) {
    const pair = await prisma.$queryRaw<{ now: bigint | null; before: bigint | null }[]>(
      Prisma.sql`SELECT SUM(t."marketUsd")::bigint AS now, SUM(y."marketUsd")::bigint AS before
                 FROM "PriceDay" t JOIN "PriceDay" y ON y."productId" = t."productId" AND y.day = ${prev.day}::date
                 JOIN "Card" c ON c.id = t."productId"
                 WHERE t.day = ${today}::date AND t."marketUsd" >= 100 AND y."marketUsd" >= 100`,
    );
    const a = Number(pair[0]?.now ?? 0);
    const b = Number(pair[0]?.before ?? 0);
    value = b > 0 ? prev.value * (a / b) : prev.value;
  }
  await prisma.indexDay.upsert({
    where: { day: today },
    create: { day: today, value, totalUsd: Math.min(total, 2_000_000_000), cardCount: n },
    update: { value, totalUsd: Math.min(total, 2_000_000_000), cardCount: n },
  });
  log(`Index ${value.toFixed(1)} over ${n} cards`);
}

export function utcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function revalidateSite(log: Log): Promise<void> {
  const url = process.env.REVALIDATE_URL || (process.env.CRON_SECRET && process.env.NEXT_PUBLIC_SITE_URL ? `${SITE_URL}/api/revalidate` : "");
  if (!url || !process.env.CRON_SECRET) {
    log("Revalidate: skipped (no REVALIDATE_URL / CRON_SECRET)");
    return;
  }
  try {
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    log(`Revalidate: HTTP ${r.status}`);
  } catch (e) {
    log(`Revalidate failed: ${(e as Error).message}`);
  }
}
