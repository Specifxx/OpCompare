// The pre-order pages' logic (RiftCompare's /radiance-preorders, for One Piece):
// which sealed products are not out yet, grouped by release date, and each
// product's buyable rows in the visitor's market: stores' pre-order prices,
// TCGplayer's cheapest listing and eBay's, all ranked by ITEM price like every
// other board on the site, with nothing re-ranked for being a partner link.
//
// Pure: no database, no network. The page reads the loaders in lib/data.ts and
// hands the results in, so tests/preorders.test.ts can pin all of it.
import { COUNTRIES, type Country } from "./country";
import type { OfferRow, SealedLite, SetLite } from "./data";
import { ebayAffiliateUrl } from "./affiliate";
import type { PanelListing } from "./listing-panel";
import { buyRow, marketRows, type BuyRow } from "./quick-view";
import { compareBoardRows } from "./board";

/** The date a sealed product releases: its own, else its set's. */
export function releaseDateOf(s: Pick<SealedLite, "releasedOn" | "setId">, setById: Map<number, Pick<SetLite, "releasedOn">>): string | null {
  return s.releasedOn ?? (s.setId != null ? setById.get(s.setId)?.releasedOn ?? null : null) ?? null;
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
const kindRank = (kind: string) => {
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
    label: country === "US" ? "eBay" : `eBay ${COUNTRIES[country].code}`,
    retailer: `ebay_${country.toLowerCase()}`,
    priceCents: l.priceCents,
    shippingCents: l.shippingCents,
    condition: null,
    href: ebayAffiliateUrl(l.url, "preorders"),
    ebay: true,
    postage: l.shippingCents == null ? "postage at checkout" : l.shippingCents === 0 ? "free postage" : "postage extra",
    updatedAt: new Date(0).toISOString(),
  };
}

export interface ProductBoard {
  rows: BuyRow[];
  /** The cheapest row of each kind, for the headline line. */
  cheapest: { store: BuyRow | null; tcgplayer: BuyRow | null; ebay: BuyRow | null };
  /** True when the eBay row came from the listings panel rather than a priced offer. */
  ebayFromPanel: boolean;
}

/**
 * A product's rows in the visitor's market, cheapest item price first. eBay's
 * row is the priced eBay offer when the eBay pass wrote one, else the headline
 * (rank 0) listing of the listings panel in this market: either way a real
 * listing, never an estimate. `loc` names the page for the affiliate sub-id.
 */
export function productBoard(offers: OfferRow[], panel: PanelListing[], country: Country, loc: string): ProductBoard {
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
  const first = (f: (r: BuyRow) => boolean) => rows.find(f) ?? null;
  return {
    rows,
    cheapest: { store: first((r) => !r.ebay && r.source !== "tcgplayer"), tcgplayer: first((r) => r.source === "tcgplayer"), ebay: first((r) => r.ebay) },
    ebayFromPanel,
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
