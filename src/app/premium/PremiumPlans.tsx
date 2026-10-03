"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanButton from "@/components/PlanButton";
import { ManageSubscriptionButton, PricingCards } from "@/components/PricingCards";
import { TIER_NAMES, planPrice, type Interval, type Tier } from "@/lib/plans";
import { useMe } from "@/lib/use-me";

// The top of /premium: the pricing cards for everyone who is not a member,
// and, once /api/me says the visitor IS Plus or Premium, their subscription
// instead (RiftCompare's member view). The page itself stays static; who the
// visitor is is learned here, client-side, like the header.
interface Sub {
  tier: Tier;
  interval: Interval | null;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

export function PremiumPlans({ checkoutOpen }: { checkoutOpen: boolean }) {
  const { me, loaded } = useMe();
  if (!loaded || !me.tier) return <PricingCards checkoutOpen={checkoutOpen} />;
  return <MemberView tier={me.tier} until={me.until} admin={me.admin} />;
}

function MemberView({ tier, until, admin }: { tier: Tier; until: string | null; admin: boolean }) {
  const [sub, setSub] = useState<Sub | null>(null);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/premium/subscription", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { subscription?: Sub | null } | null) => live && setSub(d?.subscription ?? null))
      .catch(() => {})
      .finally(() => live && setSettled(true));
    return () => {
      live = false;
    };
  }, []);

  const shownTier = sub?.tier ?? tier;
  return (
    <div className="mx-auto max-w-3xl" data-member-view>
      <section className="card-surface p-5 sm:p-6">
        <p className="eyebrow">Your subscription</p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-white">{TIER_NAMES[shownTier]}</h2>
          {sub?.interval ? (
            <p className="num text-sm text-slate-300">
              {planPrice(shownTier, sub.interval)}/{sub.interval === "month" ? "mo" : "yr"} · {sub.interval === "month" ? "monthly" : "yearly"}
            </p>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {!settled ? (
            <span className="inline-block h-4 w-48 animate-pulse rounded bg-ink-800 align-middle" />
          ) : sub?.periodEnd ? (
            sub.cancelAtPeriodEnd ? (
              <>Cancelled · your access ends on {day(sub.periodEnd)}.</>
            ) : sub.status === "past_due" ? (
              <>Your last payment didn&apos;t go through. Update your card in billing to keep {TIER_NAMES[shownTier]}.</>
            ) : (
              <>Renews on {day(sub.periodEnd)}.</>
            )
          ) : admin ? (
            <>Admin account: Premium is included.</>
          ) : until ? (
            <>Access until {day(until)}.</>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          {sub ? <ManageSubscriptionButton label="Manage billing" /> : null}
          {shownTier === "plus" ? (
            <PlanButton surface="nav:premium-member" tier="premium" className="btn-primary text-sm">
              Upgrade to Premium
            </PlanButton>
          ) : null}
        </div>
        {sub?.interval === "month" && !sub.cancelAtPeriodEnd ? (
          <p className="mt-3 text-xs text-slate-500">Yearly costs {planPrice(shownTier, "year")} a year; switch from Manage billing, prorated.</p>
        ) : null}
      </section>
      <nav aria-label="Your tools" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link href="/tools/deal-finder" className="card-surface block p-4 hover:border-ink-600">
          <span className="font-semibold text-white">Deal Finder →</span>
          <span className="mt-0.5 block text-xs text-slate-400">Every deal, every price level</span>
        </Link>
        <Link href="/tools/buy-list" className="card-surface block p-4 hover:border-ink-600">
          <span className="font-semibold text-white">Buy List Planner →</span>
          <span className="mt-0.5 block text-xs text-slate-400">{shownTier === "premium" ? "The cheapest stores for your list" : "On Premium"}</span>
        </Link>
        <Link href="/watchlist" className="card-surface block p-4 hover:border-ink-600">
          <span className="font-semibold text-white">Watchlist →</span>
          <span className="mt-0.5 block text-xs text-slate-400">The cards you&apos;ve hearted</span>
        </Link>
      </nav>
    </div>
  );
}
