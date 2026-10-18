// "Last known price": what a card cost the last time the site's own published
// price history held a price for it, shown (muted, labelled, dated) exactly
// where the site would otherwise say "No price yet" or "—". Owner, 2026-10-18:
// "maybe we could still have a price on the card, but we make it a different
// color, and in very fine print, it's like last known price."
//
// THE SERIES. The same one the live headline uses (lib/price.ts headline): in a
// market, the cheapest open listing there in its own currency, else TCGplayer's
// market price converted at the indicative rate (≈). The history files hold
// exactly those two figures per day (lib/history.ts: [day, marketUsd, lowUS …
// lowEU], written from the same aggregates the catalogue's `low` comes from), so
// the last known price is the headline of the newest history day that had one,
// for the same printing (one series per product id) and the same market. A
// reference is kept in USD and converted where it is shown, like the live one.
// Days older than LAST_KNOWN_DAYS (the card page's chart window) are not used.
//
// ONE FIGURE WITH THE CARD PAGE. Where the card page's price tile shows a
// sold-out store row as "Last seen" (lib/card-price-state.ts lastSeen), the
// last known price IS that row: its price and the day it was last seen, which
// is newer than any history point. The snapshot table and the QuickView pass
// lastSeen's own answer in (lastKnownTupleOf), so a tile, its popup and its
// card page can never show different figures. Only without such a row does the
// newest history day stand in.
//
// NEVER A LIVE PRICE. A last known price is not a listing, not a reference and
// not a price anyone can buy at: it is never in a sort, a filter, a ranking, an
// index, movers, deals, Rising/Demand, alerts, baskets, collection values, an
// eBay reference, a "cheapest"/"from" claim, JSON-LD, a title or description, a
// share image or the sitemap. It lives in its own field (`lastKnown`, never
// `low` or `marketUsd`), and tests/last-known.test.ts fails when any file outside
// the short list of display surfaces names it.
//
// Pure and client-safe (the tiles and the card page's islands import it).
import { COUNTRIES, MARKETS, type Country } from "./country";
import { fixedShortDate, longDate } from "./format";
import { usdCentsToCountry } from "./fx";
import { chartSeries, dayIso, dayNum, type Point } from "./history";
import { headline, type Priced } from "./price";

/** How far back a last known price may come from: the card page's chart window (lib/data.ts getProductHistory). */
export const LAST_KNOWN_DAYS = 365;

/** A day of history in the shape the card page reads it (lib/data.ts HistoryPoint; repeated here so this module imports no loader). */
export interface HistoryDay {
  day: string;
  marketUsd: number | null;
  lowUsd: number | null;
  lows?: (number | null)[];
}

export interface LastKnown {
  /** In the market's own currency (a reference converted from USD at the indicative rate, as the live one is). */
  cents: number;
  /** YYYY-MM-DD: the newest history day that had it. */
  day: string;
  /**
   * "listing": that day's cheapest listing here; "reference": TCGplayer's market
   * price that day, converted (≈); "seen": the sold-out store row the card page
   * shows as "Last seen" here, on the day it was last seen.
   */
  kind: "listing" | "reference" | "seen";
}

/**
 * One market's entry in the snapshot (prices.json.gz `lastKnown`, an ADDITIVE
 * field): [YYYYMMDD, cents in the market's currency] for a listing,
 * [YYYYMMDD, USD cents, 1] for TCGplayer's market price, [YYYYMMDD, cents, 2]
 * for a sold-out store row last seen that day, 0 for nothing.
 */
export type LastKnownTuple = 0 | [day: number, cents: number] | [day: number, usdCents: number, ref: 1] | [day: number, cents: number, seen: 2];

/** A sold-out row as lib/card-price-state.ts lastSeen answers it (the card page's "Last seen"). */
export interface SeenRow {
  priceCents: number;
  /** ISO timestamp: when it was last seen. */
  at: string;
}
/** Card id → one tuple per market (MARKETS order); only cards with at least one entry. */
export type LastKnownFile = Record<string, LastKnownTuple[]>;

const lowAt = (p: HistoryDay, idx: number): number | null => (p.lows ? (p.lows[idx] ?? null) : idx === 0 ? p.lowUsd : null);

/** The newest day of `history` with a headline price in `country`, as a snapshot tuple (a reference stays in USD). */
export function lastKnownTuple(history: readonly HistoryDay[], country: Country): LastKnownTuple {
  const idx = MARKETS.indexOf(country);
  if (idx < 0) return 0;
  let best: Exclude<LastKnownTuple, 0> | 0 = 0;
  for (const p of history) {
    const day = dayNum(p.day);
    if (!Number.isFinite(day) || (best && day <= best[0])) continue;
    // That day's headline: the market's cheapest listing first, else TCGplayer's market price.
    const low = lowAt(p, idx);
    if (low != null && low > 0) best = [day, low];
    else if (p.marketUsd != null && p.marketUsd > 0) best = [day, p.marketUsd, 1];
  }
  return best;
}

/**
 * The last known price's tuple in `country`: the sold-out row the card page
 * shows as "Last seen" there (pass lastSeen's answer for this card and market;
 * never a second copy of that rule), else the newest priced history day.
 */
export function lastKnownTupleOf(seen: SeenRow | null | undefined, history: readonly HistoryDay[], country: Country): LastKnownTuple {
  const day = seen ? dayNum(seen.at) : NaN;
  if (seen && seen.priceCents > 0 && Number.isFinite(day)) return [day, seen.priceCents, 2];
  return lastKnownTuple(history, country);
}

/** A snapshot tuple as shown in `country` (a reference converted with the live headline's rate). */
export function decodeLastKnown(t: LastKnownTuple | undefined, country: Country): LastKnown | null {
  if (!t) return null;
  const ref = t[2] === 1;
  return { cents: ref ? usdCentsToCountry(t[1], country) : t[1], day: dayIso(t[0]), kind: ref ? "reference" : t[2] === 2 ? "seen" : "listing" };
}

/** The last known price in `country` from a card's history (the card page and its quick view, which already hold it). */
export function lastKnownIn(history: readonly HistoryDay[], country: Country): LastKnown | null {
  return decodeLastKnown(lastKnownTuple(history, country), country);
}

/** One card's snapshot row as the catalogue's `lastKnown` (markets with nothing are left out). */
export function decodeLastKnownRow(row: readonly LastKnownTuple[] | undefined): Partial<Record<Country, LastKnown>> | undefined {
  if (!row) return undefined;
  const out: Partial<Record<Country, LastKnown>> = {};
  MARKETS.forEach((m, i) => {
    const lk = decodeLastKnown(row[i], m);
    if (lk) out[m] = lk;
  });
  return Object.keys(out).length ? out : undefined;
}

/** A catalogue row as the snapshot builder holds it: TCGplayer's market price and each market's low (MARKETS order). */
export interface LastKnownCandidate {
  id: number;
  marketUsd: number | null;
  low: readonly (number | null)[];
}

/** Does this card lack a live headline in some market (no TCGplayer market price, and no listing there)? */
export function needsLastKnown(c: LastKnownCandidate): boolean {
  // A TCGplayer market price is a live headline in every market (≈): nothing to fill.
  return c.marketUsd == null && MARKETS.some((_, i) => c.low[i] == null);
}

/**
 * The snapshot's table, built once per import (lib/price-snapshot-build.ts):
 * for every card with no live headline in some market (no listing there and no
 * TCGplayer market price), that market's last known price: the sold-out row the
 * card page shows as "Last seen" (`seenOf`: lastSeen over the very offers the
 * page reads), else the newest day of the card's own series. `seriesOf` returns
 * a product's raw history points (history bucket files); `today` is YYYYMMDD.
 */
export function lastKnownTable(
  cards: Iterable<LastKnownCandidate>,
  seriesOf: (id: number) => Point[] | undefined,
  today: number,
  seenOf: (id: number, country: Country) => SeenRow | null = () => null,
): LastKnownFile {
  const out: LastKnownFile = {};
  for (const c of cards) {
    if (!needsLastKnown(c)) continue;
    const open = MARKETS.map((_, i) => c.low[i] == null);
    const history = chartSeries(seriesOf(c.id), today, LAST_KNOWN_DAYS);
    const row = MARKETS.map((m, i): LastKnownTuple => (open[i] ? lastKnownTupleOf(seenOf(c.id, m), history, m) : 0));
    if (row.some((t) => t !== 0)) out[String(c.id)] = row;
  }
  return out;
}

/**
 * What a tile or row shows where it would say "No price yet": the card's last
 * known price in `country`, and only when it has no live headline there (a
 * listing or TCGplayer's market price always wins).
 */
export function lastKnownFor(card: Priced & { lastKnown?: Partial<Record<Country, LastKnown>> }, country: Country): LastKnown | null {
  if (headline(card, country).kind !== "none") return null;
  return card.lastKnown?.[country] ?? null;
}

/** The fine print: "Last known price · 12 Sep 2026" (format.ts fixedShortDate: the server and the browser agree). */
export function lastKnownLabel(lk: LastKnown): string {
  return `Last known price · ${fixedShortDate(lk.day)}`;
}

/** The amount as text: "≈ A$12.34" for a reference, "A$12.34" for a listing (the live headline's own marks). */
export function lastKnownAmount(lk: LastKnown, money: (cents: number) => string): string {
  return `${lk.kind === "reference" ? "≈ " : ""}${money(lk.cents)}`;
}

/** The hover text that says where the number came from. */
export function lastKnownTitle(lk: LastKnown, country: Country): string {
  const place = COUNTRIES[country].place;
  const what =
    lk.kind === "reference"
      ? "TCGplayer's market price that day, converted at an approximate rate"
      : lk.kind === "seen"
        ? `a store's listing in ${place}, sold out when we last saw it`
        : `the lowest listing we recorded in ${place} that day`;
  return `No live price right now. The last price we recorded, on ${longDate(lk.day)}: ${what}. Not a current price.`;
}
