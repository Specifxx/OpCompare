// The Buy List Planner's minimum condition (RiftCompare's lib/basket-condition.ts,
// for One Piece). Pure: the planner's client switch and /api/buy-list share it,
// and tests/buy-list-condition.test.ts pins it.
//
// THE RULE. An offer counts only when its condition is at or above the floor,
// and the filter runs BEFORE the planner picks the cheapest offer per store, so
// a store's Near Mint copy is never hidden behind its cheaper played one.
//
// THE GRADE. A store row carries the condition the importer chose it by
// (lib/match.ts conditionLabel: NM, LP, MP, HP, DMG); an unstated condition on
// a STORE row reads as Near Mint, because that is what a store's headline price
// means. TCGplayer's row is different: it is TCGplayer's lowest listing across
// every seller and EVERY condition (Offer.condition is always null for it), so
// it can be trusted only with no floor. At "NM only" or "LP or better" it is
// left out rather than assumed mint.
import { conditionRank } from "./match";

export type MinCondition = "nm" | "lp" | "any";
export const MIN_CONDITIONS: readonly MinCondition[] = ["lp", "nm", "any"];
export const DEFAULT_MIN_CONDITION: MinCondition = "any";

export const MIN_CONDITION_LABEL: Record<MinCondition, string> = { nm: "NM only", lp: "LP or better", any: "Any condition" };
export const MIN_CONDITION_PHRASE: Record<MinCondition, string> = { nm: "Near Mint only", lp: "Lightly Played or better", any: "any condition" };

const MAX_RANK: Record<MinCondition, number> = { nm: 0, lp: 1, any: Number.POSITIVE_INFINITY };

export function parseMinCondition(v: unknown): MinCondition {
  return v === "nm" || v === "lp" || v === "any" ? v : DEFAULT_MIN_CONDITION;
}

/** May this offer be used at this floor? */
export function meetsMinCondition(o: { source: string; condition: string | null }, floor: MinCondition): boolean {
  if (floor === "any") return true;
  if (o.source === "tcgplayer") return false; // any-condition low: unknown grade
  return conditionRank(o.condition ?? "") <= MAX_RANK[floor];
}

/** The free answer: a total and counts, no store names or links. */
export interface PlanTotal {
  splitTotalCents: number;
  stores: number;
  priced: number;
  unavailable: number;
}

export function planTotal(plan: { split: { totalCents: number; picks: unknown[] }[]; splitTotalCents: number; unavailable: string[] }): PlanTotal {
  return {
    splitTotalCents: plan.splitTotalCents,
    stores: plan.split.length,
    priced: plan.split.reduce((s, b) => s + b.picks.length, 0),
    unavailable: plan.unavailable.length,
  };
}

/**
 * What the free total's cheapest copies are made of (RiftCompare tells a free
 * account how many played copies its any-condition total includes): per item,
 * the cheapest live offer is played (LP or worse on a store row) or of unknown
 * grade (TCGplayer's any-condition low). Counted per item, not per copy.
 */
export function cheapestGrades(items: { offers: { source: string; priceCents: number; inStock: boolean; condition: string | null }[] }[]): { played: number; unknown: number } {
  let played = 0;
  let unknown = 0;
  for (const it of items) {
    const best = it.offers.filter((o) => o.inStock).sort((a, b) => a.priceCents - b.priceCents)[0];
    if (!best) continue;
    if (best.source === "tcgplayer") unknown++;
    else if (conditionRank(best.condition ?? "") >= 1) played++;
  }
  return { played, unknown };
}
