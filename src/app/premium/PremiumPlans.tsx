"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanButton from "@/components/PlanButton";
import { ManageSubscriptionButton, PricingCards } from "@/components/PricingCards";
import { TIER_NAMES, annualSavingPct, planPrice, type Interval, type Tier } from "@/lib/plans";
import { firePlanClick } from "@/lib/nudge-surface";
import { invalidateMe, useMe } from "@/lib/use-me";

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
  annualAvailable?: boolean;
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
  const [reload, setReload] = useState(0);
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
  }, [reload]);

  const shownTier = sub?.tier ?? tier;
  return (
    <div className="mx-auto max-w-3xl" data-member-view>
      <section className="card-surface p-5 sm:p-6">
        <p className="rb-eyebrow text-slate-500">Your subscription</p>
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
          {sub?.cancelAtPeriodEnd ? (
            <SubAction endpoint="/api/premium/resume" label={`Keep ${TIER_NAMES[shownTier]}`} busyLabel="Turning renewal back on…" doneLabel="Renewal is back on." onDone={() => setReload((n) => n + 1)} />
          ) : null}
          {sub?.interval === "month" && !sub.cancelAtPeriodEnd && sub.status === "active" && sub.annualAvailable ? (
            <SubAction
              endpoint="/api/premium/switch-to-annual"
              surface="annual-switch"
              tier={shownTier}
              label={`Switch to yearly · save ${annualSavingPct(shownTier)}%`}
              busyLabel="Switching…"
              doneLabel={`Switched to yearly, ${planPrice(shownTier, "year")}/yr.`}
              onDone={() => setReload((n) => n + 1)}
            />
          ) : null}
          {sub ? <ManageSubscriptionButton label="Manage billing" /> : null}
          {/* Plus → Premium is a prorated switch in the billing portal, so only
              for a Stripe subscription (not an admin grant, not while closed). */}
          {shownTier === "plus" && sub ? (
            <PlanButton surface="nav:premium-member" tier="premium" className="btn-primary text-sm">
              Upgrade to Premium
            </PlanButton>
          ) : null}
        </div>
        {sub?.interval === "month" && !sub.cancelAtPeriodEnd ? (
          <p className="mt-3 text-xs text-slate-500">
            Yearly costs {planPrice(shownTier, "year")} a year. Switching bills the year now, with credit for the rest of this month.
          </p>
        ) : sub?.cancelAtPeriodEnd ? (
          <p className="mt-3 text-xs text-slate-500">Keeping it turns renewal back on. Nothing is charged now, and the renewal date stays the same.</p>
        ) : null}
      </section>
      <nav aria-label="Your tools" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link href="/tools/deal-finder" className="card-surface block p-4 hover:border-ink-600">
          <span className="font-semibold text-white">Deal Finder →</span>
          <span className="mt-0.5 block text-xs text-slate-400">Every deal, every price level</span>
        </Link>
        <Link href="/tools/best-basket" className="card-surface block p-4 hover:border-ink-600">
          <span className="font-semibold text-white">Best Basket →</span>
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

// One-click subscription change from the member card (Keep, Switch to yearly):
// POST to the route, show its error in place, and re-read the subscription when
// it worked. The route changes Stripe only; entitlement follows the webhook.
function SubAction({
  endpoint,
  label,
  busyLabel,
  doneLabel,
  onDone,
  surface,
  tier,
}: {
  endpoint: string;
  label: string;
  busyLabel: string;
  doneLabel: string;
  onDone: () => void;
  surface?: string;
  tier?: Tier;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setState("busy");
    setError(null);
    if (surface) firePlanClick(surface, tier);
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "That didn't work. Please try again, or use Manage billing.");
        setState("idle");
        return;
      }
      setState("done");
      invalidateMe();
      onDone();
    } catch {
      setError("That didn't work. Please try again, or use Manage billing.");
      setState("idle");
    }
  };
  if (state === "done") return <p role="status" className="py-2.5 text-sm font-semibold text-emerald-400">{doneLabel}</p>;
  return (
    <div>
      <button type="button" onClick={run} disabled={state === "busy"} className="btn-primary text-sm disabled:opacity-60">
        {state === "busy" ? busyLabel : label}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
