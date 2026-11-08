// The free public price file (competitor scan, 2026-11-08; Scryfall's model: free data, credited with a link, is
// how a price site gets used by bots, deck tools and blogs). Served at /prices.json (src/app/prices.json/route.ts)
// from the pages' own catalogue loaders in lib/data.ts, held six hours by the CDN. The price is each printing's
// `low`, the cheapest in-stock store price per market in that market's own currency: never eBay, never converted,
// never the display-only fallback price shown where a market has none.
import { COUNTRIES, MARKETS, type Country } from "./country";
import { SITE_NAME, SITE_URL } from "./site";

export interface PriceApi {
  version: 1;
  source: string;
  home: string;
  licence: string;
  attribution: { text: string; url: string; html: string };
  generatedAt: string;
  /** market code to ISO 4217 currency */
  currency: Record<string, string>;
  products: { id: string; kind: "card" | "sealed"; name: string; number?: string; printing?: string; prices: Record<string, { cents: number; url: string }> }[];
}

export const PRICE_API_PATH = "/prices.json";

export function attributionHtml(siteUrl = SITE_URL, siteName = SITE_NAME): string {
  return `<a href="${siteUrl}">Prices from ${siteName}</a>`;
}

type Priced = { id: number; slug: string; name: string; low: Record<Country, number | null> };

function pricesOf(low: Record<Country, number | null>, url: string): Record<string, { cents: number; url: string }> {
  const out: Record<string, { cents: number; url: string }> = {};
  for (const m of MARKETS) {
    const c = low[m];
    if (c != null && c > 0) out[m] = { cents: c, url };
  }
  return out;
}

/** Pure: the public file from the catalogue rows (tests pass fixtures). Rows with no price anywhere are left out. */
export function priceApiFrom(
  cards: (Priced & { number: string | null; printing: string })[],
  sealed: Priced[],
  now: Date,
  siteUrl = SITE_URL,
  siteName = SITE_NAME,
): PriceApi {
  const products: PriceApi["products"] = [];
  for (const c of cards) {
    const prices = pricesOf(c.low, `${siteUrl}/card/${c.slug}`);
    if (Object.keys(prices).length) products.push({ id: `card:${c.id}`, kind: "card", name: c.name, number: c.number ?? undefined, printing: c.printing, prices });
  }
  for (const s of sealed) {
    const prices = pricesOf(s.low, `${siteUrl}/sealed/${s.slug}`);
    if (Object.keys(prices).length) products.push({ id: `sealed:${s.id}`, kind: "sealed", name: s.name, prices });
  }
  return {
    version: 1,
    source: siteName,
    home: siteUrl,
    licence: `Free for any use, including commercial, if you show a visible link to ${siteUrl} wherever the prices appear.`,
    attribution: { text: `Prices from ${siteName}`, url: siteUrl, html: attributionHtml(siteUrl, siteName) },
    generatedAt: now.toISOString(),
    currency: Object.fromEntries(MARKETS.map((m) => [m, COUNTRIES[m].currency])),
    products,
  };
}
