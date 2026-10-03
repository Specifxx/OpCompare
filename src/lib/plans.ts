// The paid plans: names, prices and what each unlocks. Client-safe (no Stripe,
// no Prisma) so the pricing page, the header and the server all read ONE table.
//
// Prices are RiftCompare's (Plus $2.99/mo or $23.99/yr, Premium $4.99/mo or
// $39.99/yr). scripts/stripe-setup.ts creates the Stripe Prices FROM this table,
// with lookup keys, so what the page says and what Stripe charges cannot drift.
// To change a price: edit PLAN_CENTS and re-run the "Stripe setup" workflow; it
// creates new Prices and moves the lookup keys onto them. Subscribers already
// on the old Price keep it (its metadata still names its tier).
export type Tier = "plus" | "premium";
export type Interval = "month" | "year";

export const TIERS: Tier[] = ["plus", "premium"];
export const INTERVALS: Interval[] = ["month", "year"];
export const TIER_NAMES: Record<Tier, string> = { plus: "Plus", premium: "Premium" };
export const TIER_RANK: Record<Tier, number> = { plus: 1, premium: 2 };

export const PLAN_CURRENCY = "usd";
export const PLAN_CENTS: Record<Tier, Record<Interval, number>> = {
  plus: { month: 299, year: 2399 },
  premium: { month: 499, year: 3999 },
};

/** Stripe metadata every OP Compare Price and subscription carries. */
export const STRIPE_SITE = "opcompare";
export const lookupKey = (tier: Tier, interval: Interval) => `opcompare_${tier}_${interval}`;

export function isTier(v: unknown): v is Tier {
  return v === "plus" || v === "premium";
}
export function isInterval(v: unknown): v is Interval {
  return v === "month" || v === "year";
}

export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const planPrice = (tier: Tier, interval: Interval) => usd(PLAN_CENTS[tier][interval]);
export const perMonth = (tier: Tier) => usd(Math.round(PLAN_CENTS[tier].year / 12));
export const annualSavingPct = (tier: Tier) => Math.round((1 - PLAN_CENTS[tier].year / (PLAN_CENTS[tier].month * 12)) * 100);

/** Rows a free account sees in Deal Finder; signed-out visitors see none. */
export const FREE_DEAL_ROWS = 3;

export const PLAN_PITCH: Record<Tier, string> = {
  plus: "No ads, and every deal",
  premium: "Plans which stores to buy from",
};

export const PLAN_FEATURES: Record<Tier, string[]> = {
  plus: ["No ads on any page", "Every Deal Finder deal, at every price level", "Deals in all six markets", "Supports an independent site"],
  premium: ["Everything in Plus, no ads", "Buy List Planner: the cheapest store plan for your watchlist", "Cheapest single store and cheapest split, per market", "Every Deal Finder deal"],
};

/** The comparison table on /premium: [feature, free account, Plus, Premium]. */
export const TIER_COMPARISON: [string, string, string, string][] = [
  ["Every store price, in six markets", "✓", "✓", "✓"],
  ["Watchlist (in your browser)", "✓", "✓", "✓"],
  ["Deal Finder", "Top 3", "Every deal", "Every deal"],
  ["No ads", "", "✓", "✓"],
  ["Buy List Planner", "", "", "✓"],
];

/**
 * How much of Deal Finder a visitor gets (RiftCompare: "Deal Finder gives free
 * visitors nothing", 2026-09-22). The limit is applied in the QUERY, never with
 * CSS, so locked rows never reach the page's HTML.
 */
export type DealAccess = "none" | "top3" | "full";
export function dealAccess(signedIn: boolean, tier: Tier | null): DealAccess {
  if (tier) return "full";
  return signedIn ? "top3" : "none";
}
