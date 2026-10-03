// The Stripe Checkout Session for a subscription, as a pure function so
// tests/premium.test.ts can pin it. Ported from RiftCompare without its trial
// and intro-offer branches (see DECISIONS.md, "Premium: ported, minus the trial").
import { STRIPE_SITE, TIER_NAMES, type Interval, type Tier } from "./plans";

export interface CheckoutInput {
  priceId: string;
  tier: Tier;
  interval: Interval;
  user: { id: string; email: string; stripeCustomerId: string | null };
  siteUrl: string;
}

export function checkoutParams(i: CheckoutInput) {
  const meta = { site: STRIPE_SITE, kind: "oc_premium", userId: i.user.id, tier: i.tier, interval: i.interval };
  return {
    mode: "subscription" as const,
    line_items: [{ price: i.priceId, quantity: 1 }],
    ...(i.user.stripeCustomerId ? { customer: i.user.stripeCustomerId } : { customer_email: i.user.email }),
    client_reference_id: i.user.id,
    metadata: meta,
    subscription_data: { metadata: meta, description: `OP Compare ${TIER_NAMES[i.tier]}` },
    allow_promotion_codes: true,
    success_url: `${i.siteUrl}/premium/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${i.siteUrl}/premium`,
  };
}
