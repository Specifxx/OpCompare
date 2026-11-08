// "Is this a good price?" (2026-11-08): the per-store files behind /api/check/<host>, written into the price snapshot by
// the builder (lib/price-snapshot-build.ts, `check/<host>.json.gz`), so the route reads ONE small file from GitHub and never
// a database. Pure: offers, cards and sealed in, one StoreCheck per host out. Only fresh store rows count (72 hours, the
// pages' rule), singles at Near Mint only (a played copy is another price); eBay and TCGplayer are never a store here.
// Each product key is "<market>:<productId>", and its cheapest and median come from the in-stock store prices in that market.
import { COUNTRIES, type Country } from "./country";
import { linkPath, medianCents, normaliseHost, variantOf, type CheckOffer, type CheckProduct, type StoreCheck } from "./link-check";
import { storeForSource } from "./stores";

export interface CheckOfferRow {
  productId: number;
  source: string;
  market: string;
  priceCents: number;
  url: string;
  inStock: boolean;
  condition: string | null;
  updatedAt: Date | string;
}
export interface CheckCatalogEntry {
  name: string;
  href: string;
  single: boolean;
}

/** A host is safe as a file name and a URL segment. */
export const CHECK_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const FRESH_MS = 72 * 3600 * 1000;
const nearMint = (c: string | null) => c == null || c === "" || /^(nm|near[\s-]?mint|mint|m)\b/i.test(c);

export function buildStoreChecks(rows: readonly CheckOfferRow[], catalog: ReadonlyMap<number, CheckCatalogEntry>, now: number, checkedAt: string | null): Map<string, StoreCheck> {
  const groups = new Map<string, CheckOfferRow[]>();
  for (const r of rows) {
    if (!r.source.startsWith("store:") || !(r.priceCents > 0)) continue;
    const t = typeof r.updatedAt === "string" ? Date.parse(r.updatedAt) : r.updatedAt.getTime();
    if (!(now - t < FRESH_MS)) continue;
    const p = catalog.get(r.productId);
    if (!p || (p.single && !nearMint(r.condition))) continue;
    const key = `${r.market}:${r.productId}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  type B = { offers: CheckOffer[]; products: Record<string, CheckProduct>; stores: Map<string, number>; markets: Map<string, number> };
  const byHost = new Map<string, B>();
  for (const [key, list] of groups) {
    const p = catalog.get(list[0].productId)!;
    const open = list.filter((r) => r.inStock);
    const prices = open.map((r) => r.priceCents);
    const product: CheckProduct = {
      name: p.name,
      href: p.href,
      cheapestCents: prices.length ? Math.min(...prices) : null,
      medianCents: prices.length >= 2 ? medianCents(prices) : null,
      inStockStores: new Set(open.map((r) => r.source)).size,
      listedStores: new Set(list.map((r) => r.source)).size,
    };
    for (const r of list) {
      let u: URL;
      try {
        u = new URL(r.url);
      } catch {
        continue;
      }
      const host = normaliseHost(u.hostname);
      if (!CHECK_HOST.test(host)) continue;
      let b = byHost.get(host);
      if (!b) byHost.set(host, (b = { offers: [], products: {}, stores: new Map(), markets: new Map() }));
      b.products[key] = product;
      b.offers.push([linkPath(u.pathname), key, r.priceCents, r.inStock ? 1 : 0, variantOf(r.url)]);
      b.stores.set(r.source, (b.stores.get(r.source) ?? 0) + 1);
      b.markets.set(r.market, (b.markets.get(r.market) ?? 0) + 1);
    }
  }
  const most = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const out = new Map<string, StoreCheck>();
  for (const [host, b] of byHost) {
    const source = most(b.stores);
    const region = most(b.markets);
    out.set(host, {
      v: 1,
      store: source.slice(6),
      name: storeForSource(source)?.name ?? host,
      region,
      currency: COUNTRIES[region as Country]?.currency ?? "USD",
      checkedAt,
      offers: b.offers,
      products: b.products,
    });
  }
  // A store whose listings link to another address (its myshopify.com one) is also found by its own domain.
  for (const check of [...out.values()]) {
    const own = storeForSource(`store:${check.store}`)?.base;
    if (!own) continue;
    try {
      const h = normaliseHost(new URL(own).hostname);
      if (CHECK_HOST.test(h) && !out.has(h)) out.set(h, check);
    } catch {
      /* no base */
    }
  }
  return out;
}
