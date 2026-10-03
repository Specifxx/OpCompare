// Derived lists the pages share — pure functions over the cached catalogue.
import type { Country } from "./country";
import type { CardLite, SealedLite, SetLite } from "./data";
import { savingVsMarket } from "./price";

const today = () => new Date().toISOString().slice(0, 10);

export function releasedSets(sets: SetLite[], kinds: string[] = ["booster", "extra", "premium"]): SetLite[] {
  const t = today();
  return sets
    .filter((s) => kinds.includes(s.kind) && s.releasedOn && s.releasedOn <= t)
    .sort((a, b) => (b.releasedOn ?? "").localeCompare(a.releasedOn ?? ""));
}

export function upcomingSets(sets: SetLite[]): SetLite[] {
  const t = today();
  return sets
    .filter((s) => ["booster", "extra", "premium", "starter"].includes(s.kind) && s.releasedOn && s.releasedOn > t)
    .sort((a, b) => (a.releasedOn ?? "").localeCompare(b.releasedOn ?? ""));
}

export function newestBoosterSet(sets: SetLite[]): SetLite | null {
  return releasedSets(sets, ["booster"])[0] ?? null;
}

export function mostValuable(cards: CardLite[], n: number, filter: (c: CardLite) => boolean = () => true): CardLite[] {
  return cards
    .filter((c) => c.marketUsd != null && filter(c))
    .sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0))
    .slice(0, n);
}

/** RiftCompare's "gap too good" guard for eBay-inclusive lows: a gap this deep is a wrong match, not a deal. */
export const MAX_GAP_PCT = 80;
/** The Deal Finder's own ceiling — stricter than MAX_GAP_PCT, so it already covers eBay asks in low<M>. */
export const DEAL_MAX_SAVING_PCT = 60;

/**
 * Cards whose cheapest listing in this market sits furthest under TCGplayer's
 * market price. low<M> includes eBay asks since the eBay pass (lib/ebay-import.ts),
 * so the ceiling below doubles as the gap guard (Deal Finder, home page).
 */
export function biggestSavings(cards: CardLite[], country: Country, n: number, minMarketUsd = 500): { card: CardLite; saving: number }[] {
  return cards
    .filter((c) => (c.marketUsd ?? 0) >= minMarketUsd && c.low[country] != null)
    .map((card) => ({ card, saving: savingVsMarket(card, country) ?? 0 }))
    .filter((x) => x.saving >= 10 && x.saving <= Math.min(DEAL_MAX_SAVING_PCT, MAX_GAP_PCT))
    .sort((a, b) => b.saving - a.saving)
    .slice(0, n);
}

/** Biggest 7-day moves on TCGplayer's market price (cards worth $1+). */
export function movers(cards: CardLite[], dir: "up" | "down", n: number, minMarketUsd = 100): CardLite[] {
  return cards
    .filter((c) => c.change7d != null && (c.marketUsd ?? 0) >= minMarketUsd && (dir === "up" ? c.change7d > 0 : c.change7d < 0))
    .sort((a, b) => (dir === "up" ? (b.change7d ?? 0) - (a.change7d ?? 0) : (a.change7d ?? 0) - (b.change7d ?? 0)))
    .slice(0, n);
}

/** Furthest under its own 90-day high (cards worth $3+). */
export function offHighs(cards: CardLite[], n: number): { card: CardLite; off: number }[] {
  return cards
    .filter((c) => c.high90Usd && c.marketUsd && c.marketUsd >= 300 && c.high90Usd > c.marketUsd)
    .map((card) => ({ card, off: ((card.high90Usd! - card.marketUsd!) / card.high90Usd!) * 100 }))
    .filter((x) => x.off >= 5)
    .sort((a, b) => b.off - a.off)
    .slice(0, n);
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function boosterBoxes(sealed: SealedLite[], setById: Map<number, SetLite>): SealedLite[] {
  return sealed
    .filter((s) => s.kind === "Booster Box" && s.setId != null)
    .sort((a, b) => (setById.get(b.setId!)?.releasedOn ?? "").localeCompare(setById.get(a.setId!)?.releasedOn ?? ""));
}
