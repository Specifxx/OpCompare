// The price board's rows for one market, resolved on the SERVER: store names,
// postage lines, played-copy notes, "Paid link" flags and affiliate-tagged hrefs
// (the partner ids are server environment variables). components/PriceBoardView
// only draws a BoardModel, so the card page can ship every market's model to a
// client island (it is ISR: one cached HTML for every visitor) without the store
// registry or the affiliate environment reaching the browser, and the sealed
// page draws one market's on the server. The rules are the board's own, moved
// here unchanged from components/PriceBoard.tsx (tests/ebay-board.test.ts).
import { affiliateUrl, ebaySearchUrl, isPaidLink } from "./affiliate";
import { ebayRetailer, postageLine, retailerSubId } from "./board";
import { COUNTRIES, MARKETS, type Country } from "./country";
import type { OfferRow } from "./data";
import { playedDiscounts, playedDiscountText } from "./played-discount";
import { marketRows } from "./quick-view";
import { isEbaySource, sourceLabel, storeForSource } from "./stores";

/** One open offer, cheapest first. Optional fields are left out when empty, to keep the payload small. */
export interface BoardRow {
  source: string;
  label: string;
  /** data-retailer for the click beacon. */
  retailer: string;
  priceCents: number;
  /** Affiliate-tagged where a partner applies; the store's own URL otherwise. */
  href: string;
  postage: string;
  updatedAt: string;
  condition?: string;
  /** An eBay row (the eBay pass): eBay's button and copy. */
  ebay?: true;
  /** A monetised link ("Paid link" chip). */
  paid?: true;
  policyUrl?: string;
  /** "LP · 22% under the cheapest NM here". */
  played?: string;
}

/** A store that has stocked it here and is sold out (one row per store, newest observation). */
export interface BoardSoldRow {
  source: string;
  label: string;
  retailer: string;
  priceCents: number;
  href: string;
  updatedAt: string;
}

export interface BoardModel {
  rows: BoardRow[];
  sold: BoardSoldRow[];
  /** The cheapest open listing in each OTHER market, for the empty state. */
  elsewhere: { m: Country; cents: number }[];
  /** Affiliate-tagged eBay search on this market's eBay. */
  ebaySearch: string;
}

export function boardModel(offers: OfferRow[], country: Country, opts: { page: string; ebayQuery: string }): BoardModel {
  const { page } = opts;
  const c = COUNTRIES[country];
  const here = offers.filter((o) => o.market === country && o.currency === c.currency);
  const open = marketRows(offers, country);
  // A played copy against the cheapest Near Mint one in this market.
  const played = playedDiscounts(open.map((o) => ({ id: `${o.source}-${o.market}`, condition: o.condition, isFoil: false, priceCents: o.priceCents })));
  const rows = open.map((o): BoardRow => {
    const isEbay = isEbaySource(o.source);
    const store = storeForSource(o.source);
    const pd = played.get(`${o.source}-${o.market}`);
    const row: BoardRow = {
      source: o.source,
      label: sourceLabel(o.source, country),
      retailer: isEbay ? ebayRetailer(o.source, country) : retailerSubId(o.source),
      priceCents: o.priceCents,
      href: affiliateUrl(o.url, retailerSubId(o.source), page),
      postage: postageLine(!isEbay && o.shippingCents == null && store?.shippingCents != null ? { ...o, shippingCents: store.shippingCents } : o, country),
      updatedAt: o.updatedAt,
    };
    if (o.condition) row.condition = o.condition;
    if (isEbay) row.ebay = true;
    if (isPaidLink(o.url)) row.paid = true;
    if (store?.policyUrl) row.policyUrl = store.policyUrl;
    if (pd) row.played = playedDiscountText(pd);
    return row;
  });
  // Sold-out disclosure: one row per distinct store (a store can hold several
  // dead rows), newest observation first, with when it was last seen.
  const soldBySource = new Map<string, OfferRow>();
  for (const o of here.filter((x) => !x.inStock && !isEbaySource(x.source))) {
    const cur = soldBySource.get(o.source);
    if (!cur || o.updatedAt > cur.updatedAt) soldBySource.set(o.source, o);
  }
  const sold = [...soldBySource.values()]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((o) => ({
      source: o.source,
      label: sourceLabel(o.source, country),
      retailer: isEbaySource(o.source) ? ebayRetailer(o.source, country) : retailerSubId(o.source),
      priceCents: o.priceCents,
      href: affiliateUrl(o.url, retailerSubId(o.source), page),
      updatedAt: o.updatedAt,
    }));
  const elsewhere = MARKETS.filter((m) => m !== country)
    .map((m) => {
      const best = offers.filter((o) => o.market === m && o.inStock).sort((a, b) => a.priceCents - b.priceCents)[0];
      return best ? { m, cents: best.priceCents } : null;
    })
    .filter((x): x is { m: Country; cents: number } => x != null);
  return { rows, sold, elsewhere, ebaySearch: ebaySearchUrl(country, opts.ebayQuery, `${page}-board`) };
}
