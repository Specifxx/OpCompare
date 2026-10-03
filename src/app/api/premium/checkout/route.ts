import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkoutParams } from "@/lib/checkout-params";
import { isInterval, isTier } from "@/lib/plans";
import { isPremium } from "@/lib/premium";
import { SITE_URL } from "@/lib/site";
import { priceIdFor, stripe, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// POST {tier, interval} → {url} of a hosted Stripe Checkout page.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!stripeEnabled()) return NextResponse.json({ error: "Subscriptions aren't open yet." }, { status: 503 });
  // A member changes plan in the billing portal, not with a second subscription.
  if (isPremium(user) && !user.isAdmin) return NextResponse.json({ error: "You're already a member — manage your plan from your account." }, { status: 409 });
  const body = (await req.json().catch(() => ({}))) as { tier?: unknown; interval?: unknown };
  const tier = isTier(body.tier) ? body.tier : "premium";
  const interval = isInterval(body.interval) ? body.interval : "month";
  try {
    const priceId = await priceIdFor(tier, interval);
    if (!priceId) return NextResponse.json({ error: "Subscriptions aren't open yet." }, { status: 503 });
    const session = await stripe().checkout.sessions.create(checkoutParams({ priceId, tier, interval, user, siteUrl: SITE_URL }));
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout]", (e as Error).message);
    return NextResponse.json({ error: "Checkout could not start. Please try again." }, { status: 502 });
  }
}
