// The card QuickView's data (components/QuickView.tsx, GET /api/card/[slug]) and
// the card page's phone buy path (CardTopBuy, CardStickyBuyBar): one pure place
// that decides "the open offers in a market, cheapest first", so the popup, the
// top buy block, the sticky bar and the price board's #1 row can never disagree.
// tests/quick-view.test.ts pins it.
//
// The payload is market-INDEPENDENT (every market's top rows, every market's
// eBay search) so one cached response serves every visitor and a market switch
// needs no second request. Links are affiliate-tagged HERE, on the server, so
// the environment's partner ids apply (the browser never sees those env vars).
import { affiliateUrl, cardEbayQuery, ebaySearchUrl } from "./affiliate";
import { compareBoardRows, ebayRetailer, postageLine, retailerSubId } from "./board";
import { COUNTRIES, MARKETS, type Country } from "./country";
import type { CardDetail, OfferRow } from "./data";
import { isEbaySource, sourceLabel } from "./stores";

/** Rows per market in the popup; the full page lists the rest ("See all N"). */
export const QUICKVIEW_ROWS = 5;

/**
 * The open offers in one market, cheapest first by ITEM price (compareBoardRows):
 * in stock, in the market's own currency. The price board's rule, verbatim.
 */
export function marketRows<T extends Pick<OfferRow, "market" | "currency" | "inStock" | "priceCents" | "shippingCents" | "source">>(
  offers: T[],
  country: Country,
): T[] {
  const cur = COUNTRIES[country].currency;
  return offers.filter((o) => o.market === country && o.currency === cur && o.inStock).sort(compareBoardRows);
}

/** One buyable row, ready to render: label, data-retailer, tagged href, postage line. */
export interface BuyRow {
  source: string;
  label: string;
  retailer: string;
  priceCents: number;
  shippingCents: number | null;
  condition: string | null;
  href: string;
  ebay: boolean;
  postage: string;
  updatedAt: string;
}

/** An offer as a BuyRow. `loc` is the page path the affiliate sub-id names. */
export function buyRow(o: OfferRow, country: Country, loc: string): BuyRow {
  const ebay = isEbaySource(o.source);
  return {
    source: o.source,
    label: sourceLabel(o.source, country),
    retailer: ebay ? ebayRetailer(o.source, country) : retailerSubId(o.source),
    priceCents: o.priceCents,
    shippingCents: o.shippingCents,
    condition: o.condition,
    href: affiliateUrl(o.url, retailerSubId(o.source), loc),
    ebay,
    postage: postageLine(o, country),
    updatedAt: o.updatedAt,
  };
}

/** The cheapest open offer in a market as a BuyRow, or null (CardTopBuy, the sticky bar). */
export function cheapestBuyRow(offers: OfferRow[], country: Country, loc: string): BuyRow | null {
  const best = marketRows(offers, country)[0];
  return best ? buyRow(best, country, loc) : null;
}

export interface QuickViewMarket {
  /** Open offers in this market (all of them, not just the rows sent). */
  count: number;
  /** An eBay row is among them (then the eBay search is the "more listings" strip, not the fallback). */
  ebayRow: boolean;
  /** The first QUICKVIEW_ROWS of them, cheapest first. */
  rows: BuyRow[];
  /** Affiliate-tagged eBay search for the card on this market's eBay. */
  ebaySearch: string;
}

export interface QuickViewPayload {
  id: number;
  slug: string;
  name: string;
  variant: string | null;
  number: string | null;
  rarity: string | null;
  printing: string;
  colors: string[];
  cardType: string | null;
  hasImage: boolean;
  set: { code: string; name: string; slug: string; releasedOn: string | null };
  /** The set releases after `today`: nothing ships yet, so eBay copy says "search", never "buy". */
  preRelease: boolean;
  marketUsd: number | null;
  change7d: number | null;
  /** Affiliate-tagged TCGplayer product page. */
  tcgHref: string;
  markets: Record<Country, QuickViewMarket>;
}

/** Is a set (YYYY-MM-DD) still unreleased on `today` (YYYY-MM-DD)? */
export function isPreRelease(releasedOn: string | null, today: string): boolean {
  return releasedOn != null && releasedOn > today;
}

/** Shape a card's detail into the popup's small, market-independent JSON. */
export function quickViewPayload(c: CardDetail, today: string = new Date().toISOString().slice(0, 10)): QuickViewPayload {
  const loc = `/card/${c.slug}`;
  const query = cardEbayQuery(c);
  const markets = {} as Record<Country, QuickViewMarket>;
  for (const m of MARKETS) {
    const open = marketRows(c.offers, m);
    markets[m] = {
      count: open.length,
      ebayRow: open.some((o) => isEbaySource(o.source)),
      rows: open.slice(0, QUICKVIEW_ROWS).map((o) => buyRow(o, m, loc)),
      ebaySearch: ebaySearchUrl(m, query, "quickview"),
    };
  }
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    variant: c.variant,
    number: c.number,
    rarity: c.rarity,
    printing: c.printing,
    colors: c.colors,
    cardType: c.cardType,
    hasImage: c.hasImage,
    set: { code: c.set.code, name: c.set.name, slug: c.set.slug, releasedOn: c.set.releasedOn },
    preRelease: isPreRelease(c.set.releasedOn, today),
    marketUsd: c.marketUsd,
    change7d: c.change7d,
    tcgHref: affiliateUrl(c.tcgplayerUrl, "tcgplayer", loc),
    markets,
  };
}

/** "Monkey.D.Luffy (Parallel) OP01-024" — the name a buy surface prints. */
export function cardDisplayName(c: { name: string; variant: string | null; number: string | null }): string {
  return `${c.name}${c.variant ? ` (${c.variant})` : ""}${c.number ? ` ${c.number}` : ""}`;
}
