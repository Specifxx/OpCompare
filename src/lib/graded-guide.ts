// The graded price guide, /graded (DECISIONS.md, "Graded price guide",
// 2026-10-27): every One Piece card with a live graded slab on eBay in the
// visitor's market, its cheapest PSA 10, PSA 9, BGS and CGC listing and
// TCGplayer's raw market price beside it. The card page shows the same slabs
// one card at a time under its Graded tab; this answers "what is a PSA 10 X
// worth" across the catalogue. Asking prices of live listings, never sales.
// Pure; getGradedGuide (data.ts) feeds it the snapshot.
import type { Country } from "./country";
import { PANEL_MAX_AGE_HOURS, type PanelGraded } from "./listing-panel";

export const GUIDE_GRADES = ["PSA 10", "PSA 9", "BGS 10", "BGS 9.5", "CGC 10"] as const;
/** Rows kept (priciest first): the cache entry stays a few tens of KB. */
export const GRADED_GUIDE_MAX = 250;

export interface GradedGuideCard {
  id: number;
  slug: string;
  name: string;
  number: string | null;
  variant: string | null;
  marketUsd: number | null;
}

export interface GradedGuideRow {
  slug: string;
  name: string;
  number: string | null;
  variant: string | null;
  /** TCGplayer's raw market price, US cents. */
  marketUsd: number | null;
  currency: string;
  /** Grade label → cheapest live item price in the market's currency, cents. */
  prices: Record<string, number>;
  top: { grade: string; cents: number };
}

/** "PSA 10", "BGS 9.5"; null when the slab names no grader or grade. */
export function gradeKey(grader: string | null | undefined, grade: string | null | undefined): string | null {
  const g = (grader ?? "").trim().toUpperCase();
  const n = Number((grade ?? "").trim());
  if (!g || !Number.isFinite(n) || n <= 0) return null;
  return `${g} ${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

const gradeNum = (k: string) => Number(k.split(" ").pop());

export function gradedGuideRows(
  graded: Record<string, PanelGraded[]>,
  cards: ReadonlyMap<number, GradedGuideCard>,
  market: Country,
  now: number = Date.now(),
): GradedGuideRow[] {
  const maxAge = PANEL_MAX_AGE_HOURS * 3_600_000;
  const out: GradedGuideRow[] = [];
  for (const [id, slabs] of Object.entries(graded)) {
    const card = cards.get(Number(id));
    if (!card) continue;
    const prices: Record<string, number> = {};
    let currency = "";
    for (const s of slabs) {
      if (s.market !== market || !(s.priceCents > 0)) continue;
      if (s.u != null && now - s.u > maxAge) continue;
      const k = gradeKey(s.grader, s.grade);
      if (!k) continue;
      currency ||= s.currency;
      if (s.currency !== currency) continue;
      if (prices[k] == null || s.priceCents < prices[k]) prices[k] = s.priceCents;
    }
    const grades = Object.keys(prices).sort((a, b) => gradeNum(b) - gradeNum(a) || a.localeCompare(b));
    if (!grades.length) continue;
    const best = prices["PSA 10"] != null ? "PSA 10" : grades[0];
    out.push({ slug: card.slug, name: card.name, number: card.number, variant: card.variant, marketUsd: card.marketUsd, currency, prices, top: { grade: best, cents: prices[best] } });
  }
  return out.sort((a, b) => b.top.cents - a.top.cents || a.name.localeCompare(b.name)).slice(0, GRADED_GUIDE_MAX);
}
