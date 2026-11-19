// The Stripe Checkout Session for a subscription, as a pure function so
// tests/premium.test.ts and tests/checkout-params.test.ts can pin it. Ported
// from RiftCompare without its intro-offer branch; the trial came back on 2026-11-19 (TRIAL_DAYS).
//
// Wave 2 (2026-10-03): checkout ATTRIBUTION and the RETURN PATH. `surface` (the
// wall, nudge or limit that sent the buyer, validated by isPlanClickSurface)
// and `back` (where they were, sanitizeBackPath) ride on the Session AND the
// subscription metadata; success lands on /premium/welcome with `back`, and a
// cancel at Stripe returns to `back` (else /premium).
import { STRIPE_SITE, TIER_NAMES, type Interval, type Tier } from "./plans";

/**
 * The free trial (owner, 2026-11-19: Premium "very easy to get … a free trial", reversing "Premium: ported, minus the trial"): 14 days,
 * card taken by Stripe Checkout, charged on day 15 unless cancelled. Only for a buyer who has never been a Stripe customer of ours (no
 * stripeCustomerId), so one person gets one trial. `trialing` already entitles (stripe-entitlement.ts ENTITLED_STATUSES).
 */
export const TRIAL_DAYS = 14;

export interface CheckoutInput {
  priceId: string;
  tier: Tier;
  interval: Interval;
  user: { id: string; email: string; stripeCustomerId: string | null };
  siteUrl: string;
  /** A validated surface (isPlanClickSurface), or null. */
  surface?: string | null;
  /** A sanitized same-origin path (sanitizeBackPath), or null. */
  back?: string | null;
}

export function checkoutParams(i: CheckoutInput) {
  const meta: Record<string, string> = { site: STRIPE_SITE, kind: "oc_premium", userId: i.user.id, tier: i.tier, interval: i.interval };
  if (i.surface) meta.surface = i.surface;
  if (i.back) meta.back = i.back;
  const backQ = i.back ? `&back=${encodeURIComponent(i.back)}` : "";
  return {
    mode: "subscription" as const,
    line_items: [{ price: i.priceId, quantity: 1 }],
    ...(i.user.stripeCustomerId ? { customer: i.user.stripeCustomerId } : { customer_email: i.user.email }),
    client_reference_id: i.user.id,
    metadata: meta,
    subscription_data: {
      metadata: meta,
      description: `OP Compare ${TIER_NAMES[i.tier]}`,
      ...(i.user.stripeCustomerId ? {} : { trial_period_days: TRIAL_DAYS }),
    },
    allow_promotion_codes: true,
    success_url: `${i.siteUrl}/premium/welcome?session_id={CHECKOUT_SESSION_ID}${backQ}`,
    cancel_url: `${i.siteUrl}${i.back ?? "/premium"}`,
  };
}
