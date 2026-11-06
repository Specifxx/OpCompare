import type { Country } from "./country";
import type { CardLite, OfferRow, SealedLite } from "./data";
import type { PanelGraded, PanelListing } from "./listing-panel";
import { PANEL_MAX_AGE_HOURS } from "./listing-panel";
import { gradeKey } from "./graded-guide";

// The Black Friday / Cyber Monday PRICE WATCH (2026-11-06; DECISIONS.md, "Black
// Friday and Cyber Monday price watch pages"). The owner's October numbers: the
// US made 73% of affiliate earnings at a US$108 average order, one US$6.4k order
// earned as much as twelve ordinary days, and eBay credits only a purchase made
// within 24 hours of the click. So /black-friday and /cyber-monday carry, under
// the deals, three sections that each end in a LIVE eBay listing in the market:
//
//   1. Sealed boxes: in-stock booster boxes and cases, the cheapest store
//      beside the cheapest eBay row the pass captured, dearest first.
//   2. Biggest price drops: the cards whose TCGplayer market price fell most
//      over seven days (`change7d`), each with its headline eBay listing.
//   3. Graded cards: the dearest live PSA/BGS/CGC slab per card, from the same
//      rows the card pages' Graded tab and /graded read.
//
// PURE (tests/price-watch.test.ts); getPriceWatch in data.ts feeds it the
// snapshot. The site's rules hold: an eBay row is never a store, a deal or "the
// cheapest"; no "was" price or countdown; asking prices, not sales.

export const SEALED_WATCH_ROWS = 12;
export const DROP_WATCH_ROWS = 8;
export const GRADED_WATCH_ROWS = 12;
/** A card must be worth this much (TCGplayer market, US cents) to count as a drop worth a click. */
export const DROP_MIN_USD = 500;
/** A graded asking price above this (cents of the market's currency) is a joke or a typo, not a market. */
export const GRADED_WATCH_MAX_CENTS = 500_000;

const BOX_KINDS = ["Booster Case", "Booster Box", "Display Case", "Display"];
const kindRank = (kind: string) => {
  const i = BOX_KINDS.indexOf(kind);
  return i === -1 ? BOX_KINDS.length : i;
};

export interface SealedWatchRow {
  sealed: SealedLite;
  /** The cheapest in-stock store price in the market, cents (SealedLite.low). */
  storeCents: number;
  /** The cheapest fresh in-stock eBay offer in the market, or null. */
  ebay: { priceCents: number; source: string; url: string; shippingCents: number | null } | null;
}

/** Sealed products in stock at a store in `market`, boxes and cases first, dearest first; each with its cheapest eBay row. */
export function sealedWatch(sealed: readonly SealedLite[], offers: ReadonlyMap<number, readonly OfferRow[]>, market: Country, limit = SEALED_WATCH_ROWS): SealedWatchRow[] {
  const out: SealedWatchRow[] = [];
  for (const s of sealed) {
    const low = s.low[market];
    if (s.presale || low == null || !(s.stores[market] > 0)) continue;
    let ebay: SealedWatchRow["ebay"] = null;
    for (const o of offers.get(s.id) ?? []) {
      if (!o.source.startsWith("ebay") || o.market !== market || !o.inStock) continue;
      if (!ebay || o.priceCents < ebay.priceCents) ebay = { priceCents: o.priceCents, source: o.source, url: o.url, shippingCents: o.shippingCents };
    }
    out.push({ sealed: s, storeCents: low, ebay });
  }
  return out.sort((a, b) => kindRank(a.sealed.kind) - kindRank(b.sealed.kind) || b.storeCents - a.storeCents || a.sealed.id - b.sealed.id).slice(0, limit);
}

export interface DropWatchRow {
  card: CardLite;
  /** Signed seven-day change of TCGplayer's market price, percent. */
  pct: number;
  /** The card's headline (rank-0) fresh eBay listing in the market, or null. */
  ebay: { priceCents: number; shippingCents: number | null; currency: string; url: string; title: string } | null;
}

/** The steepest seven-day falls in TCGplayer's market price among cards worth DROP_MIN_USD or more, with their eBay listing. */
export function dropsWatch(cards: readonly CardLite[], listings: Readonly<Record<string, PanelListing[]>>, market: Country, now: number = Date.now(), limit = DROP_WATCH_ROWS): DropWatchRow[] {
  const maxAge = PANEL_MAX_AGE_HOURS * 3_600_000;
  return cards
    .filter((c) => c.change7d != null && c.change7d < 0 && c.marketUsd != null && c.marketUsd >= DROP_MIN_USD)
    .sort((a, b) => a.change7d! - b.change7d! || b.marketUsd! - a.marketUsd! || a.id - b.id)
    .slice(0, limit)
    .map((card) => {
      const l = (listings[String(card.id)] ?? [])
        .filter((x) => x.market === market && (x.u == null || now - x.u <= maxAge))
        .sort((a, b) => a.rank - b.rank)[0];
      return { card, pct: card.change7d!, ebay: l ? { priceCents: l.priceCents, shippingCents: l.shippingCents, currency: l.currency, url: l.url, title: l.title } : null };
    });
}

export interface GradedWatchCard {
  id: number;
  slug: string;
  name: string;
  number: string | null;
  variant: string | null;
  marketUsd: number | null;
}

export interface GradedWatchRow {
  card: GradedWatchCard;
  /** "PSA 10", "BGS 9.5". */
  grade: string;
  priceCents: number;
  shippingCents: number | null;
  currency: string;
  url: string;
  title: string;
  imageUrl: string | null;
}

const gradeNum = (k: string) => Number(k.split(" ").pop());
const score = (k: string) => gradeNum(k) + (k.startsWith("PSA") ? 0.01 : 0);

/** One row per card: its best live grade in the market (PSA first on a tie, cheapest of that grade), dearest cards first. */
export function gradedWatch(
  graded: Readonly<Record<string, PanelGraded[]>>,
  cards: ReadonlyMap<number, GradedWatchCard>,
  market: Country,
  now: number = Date.now(),
  limit = GRADED_WATCH_ROWS,
): GradedWatchRow[] {
  const maxAge = PANEL_MAX_AGE_HOURS * 3_600_000;
  const out: GradedWatchRow[] = [];
  for (const [id, slabs] of Object.entries(graded)) {
    const card = cards.get(Number(id));
    if (!card) continue;
    let best: { key: string; slab: PanelGraded } | null = null;
    for (const s of slabs) {
      if (s.market !== market || (s.u != null && now - s.u > maxAge)) continue;
      if (!Number.isInteger(s.priceCents) || s.priceCents <= 0 || s.priceCents > GRADED_WATCH_MAX_CENTS) continue;
      const key = gradeKey(s.grader, s.grade);
      if (!key) continue;
      if (!best || score(key) > score(best.key) || (score(key) === score(best.key) && s.priceCents < best.slab.priceCents)) best = { key, slab: s };
    }
    if (!best) continue;
    const { slab } = best;
    out.push({ card, grade: best.key, priceCents: slab.priceCents, shippingCents: slab.shippingCents, currency: slab.currency, url: slab.url, title: slab.title, imageUrl: slab.imageUrl });
  }
  return out.sort((a, b) => b.priceCents - a.priceCents || a.card.name.localeCompare(b.card.name)).slice(0, limit);
}
