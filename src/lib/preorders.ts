// The pre-order pages' logic (RiftCompare's /radiance-preorders, for One Piece):
// which sealed products are not out yet, grouped by release date, and each
// product's rows in the visitor's market, in two groups (owner, 2026-10-16):
//   - the MARKETPLACES, eBay then TCGplayer: each one's cheapest listing here,
//     pinned above the stores in their own labelled block, never numbered,
//     never counted as a store, never given the "Cheapest" badge;
//   - the STORES: every open store pre-order, ranked by ITEM price like every
//     other board on the site, then the stores that list it here but are sold
//     out (or were not seen lately), last and never priced as buyable.
// The product's headline ("From") is still the cheapest open offer from anyone,
// so pinning a marketplace never moves the number a product is shown at.
//
// Pure: no database, no network. The page reads the loaders in lib/data.ts and
// hands the results in, so tests/preorders.test.ts can pin all of it.
import { COUNTRIES, type Country } from "./country";
import type { OfferRow, SealedLite, SetLite } from "./data";
import { affiliateUrl, ebayAffiliateUrl } from "./affiliate";
import type { PanelListing } from "./listing-panel";
import { buyRow, marketRows, type BuyRow } from "./quick-view";
import { compareBoardRows, postageLine, retailerSubId } from "./board";
import { offerStock } from "./sealed-offers";
import { sourceLabel, storesIn } from "./stores";

/** The date a sealed product releases: its own, else its set's. */
export function releaseDateOf(s: Pick<SealedLite, "releasedOn" | "setId">, setById: Map<number, Pick<SetLite, "releasedOn">>): string | null {
  return s.releasedOn ?? (s.setId != null ? setById.get(s.setId)?.releasedOn ?? null : null) ?? null;
}

/** Set code → its dedicated pre-order route (a group of that set links to it). */
export const PREORDER_PAGES: Record<string, string> = { EB05: "/eb05-preorders", OP18: "/op18-preorders" };

/**
 * A set's pre-order page while the set is unreleased (its release date is after
 * `today`), else null. Self-retiring: the link goes on release day, with no edit.
 * The set page and /release-dates link through this.
 */
export function preorderPageFor(set: Pick<SetLite, "code" | "releasedOn">, today: string): string | null {
  const href = PREORDER_PAGES[set.code];
  return href && set.releasedOn && set.releasedOn > today ? href : null;
}

export interface PreorderLink {
  code: string;
  href: string;
  name: string;
  releasedOn: string;
}

/** Every set with a pre-order page that is still unreleased (preorderPageFor), soonest release first: the homepage's "Pre-orders open" line. */
export function upcomingPreorderPages(sets: Pick<SetLite, "code" | "name" | "releasedOn">[], today: string): PreorderLink[] {
  const seen = new Set<string>();
  return sets
    .flatMap((s) => {
      const href = preorderPageFor(s, today);
      if (!href || seen.has(s.code)) return [];
      seen.add(s.code);
      return [{ code: s.code, href, name: s.name, releasedOn: s.releasedOn! }];
    })
    .sort((a, b) => a.releasedOn.localeCompare(b.releasedOn) || a.code.localeCompare(b.code));
}

/** Order of products inside a release: the ones people compare first. */
const KIND_ORDER = [
  "Booster Box",
  "Booster Case",
  "Display",
  "Display Case",
  "Double Pack Set",
  "Premium Collection",
  "Starter Deck",
  "Sleeved Booster Pack",
  "Booster Pack",
];
/** A sealed kind's place in a release's product list (KIND_ORDER; anything else last). */
export const kindRank = (kind: string) => {
  const i = KIND_ORDER.indexOf(kind);
  return i < 0 ? KIND_ORDER.length : i;
};

export interface PreorderGroup {
  /** YYYY-MM-DD, the release date shared by the group. */
  releasedOn: string;
  /** The set most of the group belongs to (null for a collection with no set). */
  set: SetLite | null;
  products: SealedLite[];
}

/**
 * Every sealed product that is not out yet, grouped by release date, soonest
 * first. "Not out" is `presale` OR a release date after today; a product the
 * import has flipped out of presale and dated in the past drops out on its own.
 */
export function preorderGroups(sealed: SealedLite[], sets: SetLite[], today: string): PreorderGroup[] {
  const setById = new Map(sets.map((s) => [s.id, s]));
  const byDate = new Map<string, SealedLite[]>();
  for (const s of sealed) {
    const date = releaseDateOf(s, setById);
    if (!date) continue;
    if (!(s.presale || date > today)) continue;
    if (date < today && !s.presale) continue;
    (byDate.get(date) ?? byDate.set(date, []).get(date)!).push(s);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([releasedOn, products]) => {
      const counts = new Map<number, number>();
      for (const p of products) if (p.setId != null) counts.set(p.setId, (counts.get(p.setId) ?? 0) + 1);
      const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        releasedOn,
        set: topId != null ? setById.get(topId) ?? null : null,
        products: [...products].sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.name.localeCompare(b.name)),
      };
    });
}

/** The group for a booster set code (e.g. "OP18"), or null. */
export function groupForSet(groups: PreorderGroup[], code: string): PreorderGroup | null {
  return groups.find((g) => g.set?.code === code && g.set.kind === "booster") ?? groups.find((g) => g.set?.code === code) ?? null;
}

/** One eBay listing from the listings panel as a buyable row (the board's ebay row shape). */
function panelRow(l: PanelListing, country: Country): BuyRow {
  return {
    source: "ebay",
    label: sourceLabel("ebay", country),
    retailer: `ebay_${country.toLowerCase()}`,
    priceCents: l.priceCents,
    shippingCents: l.shippingCents,
    condition: null,
    href: ebayAffiliateUrl(l.url, "preorders"),
    ebay: true,
    // The postage eBay states, as every eBay row shows it ("delivered" only when it is known).
    postage: postageLine({ source: "ebay", priceCents: l.priceCents, shippingCents: l.shippingCents }, country),
    updatedAt: new Date(0).toISOString(),
  };
}

/** A store that lists the product in this market but cannot take an order now: shown last, never priced as buyable. */
export interface SoldOutRow {
  source: string;
  label: string;
  retailer: string;
  href: string;
  /** What the store last listed it at: context only, never drawn as a price to buy at. */
  priceCents: number;
  updatedAt: string;
  /** "soldout": sold out on a fresh read. "unknown": not seen within 72 hours (a stale row reads as unavailable, never as open). */
  state: "soldout" | "unknown";
}

export interface ProductBoard {
  /** Every open row in the market (stores, TCGplayer, eBay), cheapest item price first: the headline price and the structured data. */
  rows: BuyRow[];
  /** The store ranking: open store pre-orders only, cheapest item price first. Never a TCGplayer or eBay row. */
  stores: BuyRow[];
  /** Stores that list it here and are sold out or stale: one row per store, sold out before not-seen, each cheapest first. */
  soldOut: SoldOutRow[];
  /** The cheapest row of each kind: `ebay` and `tcgplayer` are the pinned Marketplaces group. */
  cheapest: { store: BuyRow | null; tcgplayer: BuyRow | null; ebay: BuyRow | null };
  /** True when the eBay row came from the listings panel rather than a priced offer. */
  ebayFromPanel: boolean;
}

/** A store's row: a `store:` source (TCGplayer and eBay are marketplaces here, never stores). */
const isStoreRow = (source: string) => source.startsWith("store:");

/**
 * A product's rows in the visitor's market. eBay's row is the priced eBay offer
 * when the eBay pass wrote one, else the headline (rank 0) listing of the
 * listings panel in this market: either way a real listing, never an estimate.
 * `loc` names the page for the affiliate sub-id; `now` dates the sold-out rows.
 */
export function productBoard(offers: OfferRow[], panel: PanelListing[], country: Country, loc: string, now: number = Date.now()): ProductBoard {
  const open = marketRows(offers, country).map((o) => buyRow(o, country, loc));
  let ebayFromPanel = false;
  if (!open.some((r) => r.ebay)) {
    const head = panel.filter((l) => l.market === country).sort((a, b) => a.rank - b.rank)[0];
    if (head && head.priceCents > 0) {
      open.push(panelRow(head, country));
      ebayFromPanel = true;
    }
  }
  const rows = open.sort((a, b) => compareBoardRows(a, b));
  const stores = rows.filter((r) => isStoreRow(r.source));
  const first = (f: (r: BuyRow) => boolean) => rows.find(f) ?? null;

  // Sold out / not seen: the market's store rows that are not open, one per
  // store (its newest observation), and never a store that is open here.
  const cur = COUNTRIES[country].currency;
  const openSources = new Set(stores.map((r) => r.source));
  const dead = new Map<string, OfferRow>();
  for (const o of offers) {
    if (o.market !== country || o.currency !== cur || !isStoreRow(o.source) || openSources.has(o.source)) continue;
    if (offerStock({ priceCents: o.priceCents, inStock: o.inStock, lastSeen: o.updatedAt }, now) === "open") continue;
    const prev = dead.get(o.source);
    if (!prev || o.updatedAt > prev.updatedAt) dead.set(o.source, o);
  }
  const soldOut = [...dead.values()]
    .map((o): SoldOutRow => ({
      source: o.source,
      label: sourceLabel(o.source, country),
      retailer: retailerSubId(o.source),
      href: affiliateUrl(o.url, retailerSubId(o.source), loc),
      priceCents: o.priceCents,
      updatedAt: o.updatedAt,
      state: offerStock({ priceCents: o.priceCents, inStock: o.inStock, lastSeen: o.updatedAt }, now) === "unknown" ? "unknown" : "soldout",
    }))
    .sort((a, b) => (a.state === b.state ? 0 : a.state === "soldout" ? -1 : 1) || a.priceCents - b.priceCents || a.label.localeCompare(b.label));

  return {
    rows,
    stores,
    soldOut,
    cheapest: { store: stores[0] ?? null, tcgplayer: first((r) => r.source === "tcgplayer"), ebay: first((r) => r.ebay) },
    ebayFromPanel,
  };
}

/** One product of a release as the page loaded it: every market's offers, and its board in the visitor's market. */
export interface PreorderItem {
  s: Pick<SealedLite, "kind">;
  offers: OfferRow[];
  board: ProductBoard;
}

export interface PreorderSummary {
  /** Stores the site reads in this market (the store registry): the same count "We track N stores" prints in the EB05 post. */
  checked: number;
  /** Distinct stores with an open pre-order here for any of the release's products. Never TCGplayer or eBay. */
  taking: number;
  /** The cheapest open STORE pre-order here for the release's booster box, and who has it. */
  box: { priceCents: number; label: string } | null;
  /** Across all six markets: distinct stores listing any of the release's products on a fresh read (open or sold out), how many of them are open, and in how many markets. */
  all: { listing: number; taking: number; markets: number };
}

/**
 * The summary strip at the top of a release's page, computed from the same
 * products the page draws, so the two can never disagree. Stores only: TCGplayer
 * and eBay are never counted as stores (CLAUDE.md). A row not seen within 72
 * hours is neither "listing" nor "taking" (lib/sealed-offers.ts offerStock).
 */
export function preorderSummary(items: PreorderItem[], country: Country, now: number = Date.now()): PreorderSummary {
  const taking = new Set(items.flatMap((i) => i.board.stores.map((r) => r.source)));
  const boxRow = items.find((i) => i.s.kind === "Booster Box")?.board.stores[0] ?? null;
  const listing = new Set<string>();
  const open = new Set<string>();
  const markets = new Set<string>();
  for (const i of items) {
    for (const o of i.offers) {
      if (!isStoreRow(o.source)) continue;
      const m = COUNTRIES[o.market as Country];
      if (!m || o.currency !== m.currency) continue;
      const state = offerStock({ priceCents: o.priceCents, inStock: o.inStock, lastSeen: o.updatedAt }, now);
      if (state === "unknown") continue;
      listing.add(o.source);
      markets.add(o.market);
      if (state === "open") open.add(o.source);
    }
  }
  return {
    checked: storesIn(country).length,
    taking: taking.size,
    box: boxRow ? { priceCents: boxRow.priceCents, label: boxRow.label } : null,
    all: { listing: listing.size, taking: open.size, markets: markets.size },
  };
}

/** "20 November 2026" from YYYY-MM-DD. */
export function longDateOf(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "20 Nov" from YYYY-MM-DD. */
export function shortDateOf(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Whole days from `today` to `iso` (0 on the day, negative after). */
export function daysUntil(iso: string, today: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
