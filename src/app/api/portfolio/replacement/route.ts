import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { getCountry } from "@/lib/get-country";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { PORTFOLIO_FREE, replacementInputs } from "@/lib/collection-server";
import { cheapestSplit, replacementPreview } from "@/lib/portfolio-replacement";

export const dynamic = "force-dynamic";

// What it would cost to BUY this collection again today — RiftCompare's
// /api/portfolio/replacement, ported in wave 2 (2026-10-03).
//
// "Collection value" on /portfolio is the lowest in-stock ITEM price in the
// viewer's market, condition-adjusted. This answers the OTHER question —
// replacement cost — and leaves the headline alone.
//
// INTERIM (until the tools track's Best Basket is on main): each copy at its
// cheapest in-stock listing at a real store or TCGplayer, BEFORE POSTAGE
// (lib/portfolio-replacement.ts). The integrator swaps in planBasket, which
// charges delivery once per store as RiftCompare's does.
//
// The total is free; the store-by-store plan is Premium. A non-Premium
// response carries only the aggregate — no store names, lines or links.
//
// Behind a button and rate-limited per user: it reads every eligible listing
// for every card held (lib/collection-server.ts replacementInputs).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!isPremium(user) && !PORTFOLIO_FREE) return NextResponse.json({ error: "Premium required" }, { status: 403 });
  const rl = rateLimit(`replacement:${user.id}`, 12, 3_600_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const full = isPremium(user, "premium");
  const country = getCountry();
  try {
    const { wanted, skipped, empty, listings } = await replacementInputs(user.id, country);
    if (empty) return NextResponse.json({ error: "Nothing in your collection yet." }, { status: 400 });
    const result = cheapestSplit(wanted, listings);
    return NextResponse.json(
      {
        ...(full ? result : replacementPreview(result)),
        // What the SAME cards contribute to the headline value, so the panel
        // compares like with like.
        valuedCents: wanted.reduce((s, w) => s + w.valueCents, 0),
        pricedHoldings: wanted.length,
        skippedHoldings: skipped,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error("[portfolio/replacement] query failed", e);
    return NextResponse.json({ error: "Store prices are unavailable right now. Try again in a few minutes." }, { status: 503 });
  }
}
