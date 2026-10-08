// The offers one import run just wrote, kept in memory and written to a local
// file at the end of the run, so the price snapshot (lib/price-snapshot-build.ts)
// can be built WITHOUT reading the Offer table back out of Postgres. That read
// is ~650,000 rows (over 100 MB of Neon transfer) per snapshot: on a 5 GB a month
// allowance it would be the biggest cost on the site (owner, 2026-10-08).
//
// A source is COVERED once its rows were written this run (a store that read
// fine but matched nothing is covered, with no rows). The snapshot takes
// covered sources from here, and everything else (a store that failed, a
// partial import) from the previous snapshot, so a bad store keeps its rows for
// the 72 hours the aggregates allow, exactly as the database does.
import fs from "node:fs";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

/** [productId, source, market, priceCents, currency, url, inStock (1/0), condition, shippingCents, updatedAt (ms)] */
export type RunOffer = [number, string, string, number, string, string, 0 | 1, string | null, number | null, number];

export interface RunOffersFile {
  v: 1;
  at: string;
  covered: string[]; // "source|market"
  offers: RunOffer[];
}

const offers: RunOffer[] = [];
const covered = new Set<string>();

export const coverKey = (source: string, market: string) => `${source}|${market}`;

/** Record one source's rows (an empty list still marks it covered). */
export function recordRunOffers(source: string, market: string, rows: { productId: number; priceCents: number; currency: string; url: string; inStock: boolean; condition: string | null; shippingCents?: number | null }[], at: Date): void {
  covered.add(coverKey(source, market));
  const t = at.getTime();
  for (const r of rows) offers.push([r.productId, source, market, r.priceCents, r.currency, r.url, r.inStock ? 1 : 0, r.condition, r.shippingCents ?? null, t]);
}

export function resetRunOffers(): void {
  offers.length = 0;
  covered.clear();
}

export function runOffersSnapshot(): RunOffersFile {
  return { v: 1, at: new Date().toISOString(), covered: [...covered], offers: [...offers] };
}

export function writeRunOffers(file: string): { offers: number; covered: number; bytes: number } {
  const body = gzipSync(Buffer.from(JSON.stringify(runOffersSnapshot())), { level: 6 });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  return { offers: offers.length, covered: covered.size, bytes: body.length };
}

export function readRunOffers(file: string): RunOffersFile {
  return JSON.parse(gunzipSync(fs.readFileSync(file)).toString("utf8")) as RunOffersFile;
}

/**
 * Does a row of the PREVIOUS snapshot carry into the new one? Yes when this run
 * did not write its source (a store that failed, a partial import), the store is
 * still in the registry, it is not an eBay row (the eBay pass owns those, read
 * from Postgres) and it is still inside the 72-hour window.
 */
export function keepCarried(
  o: { source: string; market: string; updatedAt: string },
  covered: ReadonlySet<string>,
  known: ReadonlySet<string>,
  now: number,
  freshMs: number,
): boolean {
  if (o.source.startsWith("ebay")) return false;
  if (covered.has(coverKey(o.source, o.market))) return false;
  if (!known.has(o.source)) return false;
  const t = Date.parse(o.updatedAt);
  return Number.isFinite(t) && now - t < freshMs;
}
