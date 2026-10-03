"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TIER_NAMES, type Tier } from "@/lib/plans";
import { fetchMe, invalidateMe } from "@/lib/use-me";

// Stripe sends the visitor back before (or just after) its webhook lands, so
// poll /api/me for up to 20 seconds until the plan shows (RiftCompare's
// PremiumActivationPoller).
export function WelcomePoller() {
  const [tier, setTier] = useState<Tier | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    let tries = 0;
    let stop = false;
    const tick = async () => {
      invalidateMe();
      const me = await fetchMe();
      if (stop) return;
      if (me.tier) return setTier(me.tier);
      if (++tries >= 14) return setGaveUp(true);
      setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, []);
  if (tier) {
    return (
      <>
        <h1 className="text-4xl text-white">You&apos;re {TIER_NAMES[tier]}!</h1>
        <p className="mt-3 text-slate-300">Thank you for supporting OP Compare. Ads are gone{tier === "premium" ? ", and the Buy List Planner is yours" : ""}.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/tools/deal-finder" className="rounded-lg bg-brand-500 px-4 py-2.5 font-bold text-white hover:bg-brand-600">
            Open Deal Finder
          </Link>
          {tier === "premium" ? (
            <Link href="/tools/buy-list" className="rounded-lg border border-ink-600 px-4 py-2.5 font-semibold text-white">
              Plan a buy list
            </Link>
          ) : null}
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="text-3xl text-white">{gaveUp ? "Payment received" : "Confirming your payment…"}</h1>
      <p className="mt-3 text-slate-300">
        {gaveUp ? "Your plan is taking a little longer than usual to switch on. It will appear on your account within a few minutes." : "This takes a few seconds."}
      </p>
      {gaveUp ? (
        <Link href="/account" className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2.5 font-bold text-white">
          Go to your account
        </Link>
      ) : null}
    </>
  );
}
