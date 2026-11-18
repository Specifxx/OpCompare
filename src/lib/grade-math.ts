// "Should I grade this?" (/tools/should-i-grade; DECISIONS.md, "Should I grade
// this? calculator", 2026-11-18). Pure, so tests/grade-math.test.ts pins it.
//
// The inputs are real or typed by the visitor, never invented by us:
//   raw   TCGplayer's market price for a raw copy (US cents)
//   psa10 the cheapest live US eBay PSA 10 listing (asking price, cents)
//   psa9  the cheapest live US eBay PSA 9 listing, or null when none is listed
//   p10   the visitor's own guess of the chance their copy comes back a 10
//   cost  what grading costs them per card (fee + postage), typed by the visitor
// A card that misses a 10 is valued at PSA 9 when a PSA 9 is listed, else at the
// raw price (we never guess a PSA 8 price). Asking prices, not sales: the page
// says so and never calls the result a profit.

export interface GradeInputs {
  raw: number;
  psa10: number;
  psa9: number | null;
  /** 0..1 */
  p10: number;
  /** Cents per card, or null until the visitor types one. */
  cost: number | null;
}

export interface GradeResult {
  /** What a graded copy is worth on average at the visitor's odds, cents. */
  expected: number;
  /** expected − raw: the most grading can cost and still break even, cents (may be ≤ 0). */
  breakEven: number;
  /** expected − raw − cost, or null without a cost. */
  gain: number | null;
  verdict: "grade" | "keep-raw" | "need-cost" | "never";
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function gradeMath(i: GradeInputs): GradeResult {
  const p = clamp01(i.p10);
  const miss = i.psa9 != null && i.psa9 > 0 ? i.psa9 : i.raw;
  const expected = Math.round(p * i.psa10 + (1 - p) * miss);
  const breakEven = expected - i.raw;
  if (breakEven <= 0) return { expected, breakEven, gain: null, verdict: "never" };
  if (i.cost == null || !Number.isFinite(i.cost) || i.cost < 0) return { expected, breakEven, gain: null, verdict: "need-cost" };
  const gain = breakEven - Math.round(i.cost);
  return { expected, breakEven, gain, verdict: gain > 0 ? "grade" : "keep-raw" };
}

export interface GradeRow {
  slug: string;
  name: string;
  number: string | null;
  variant: string | null;
  raw: number;
  psa10: number;
  psa9: number | null;
}

/** The cards the calculator can price: a raw market price and a live US PSA 10, in US dollars only (no conversion). */
export function gradeRows(
  rows: readonly { slug: string; name: string; number: string | null; variant: string | null; marketUsd: number | null; currency: string; prices: Record<string, number> }[],
): GradeRow[] {
  return rows
    .filter((r) => r.currency === "USD" && r.marketUsd != null && r.marketUsd > 0 && r.prices["PSA 10"] > 0)
    .map((r) => ({ slug: r.slug, name: r.name, number: r.number, variant: r.variant, raw: r.marketUsd as number, psa10: r.prices["PSA 10"], psa9: r.prices["PSA 9"] ?? null }));
}
