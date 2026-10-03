"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { INTERVALS, PLAN_FEATURES, PLAN_PITCH, TIERS, TIER_NAMES, annualSavingPct, perMonth, planPrice, type Interval, type Tier } from "@/lib/plans";
import { firePlanClick } from "@/lib/nudge-surface";
import { useMe } from "@/lib/use-me";
import { Icon } from "./Icon";

/**
 * Start Stripe Checkout for a signed-in visitor: on success the browser is
 * already on its way to Stripe and this resolves null; otherwise it resolves
 * the error to show. Shared by these cards and the Plan dialog (PlanDialog), so
 * there is one checkout path. Records a "checkout" premium-interest beacon
 * first, and the surface that got the visitor here.
 */
export async function startCheckout(tier: Tier, iv: Interval, surface: string): Promise<string | null> {
  firePlanClick("checkout", tier);
  if (surface !== "checkout") firePlanClick(surface, tier);
  try {
    const r = await fetch("/api/premium/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier, interval: iv }) });
    const j = (await r.json()) as { url?: string; error?: string };
    if (j.url) {
      window.location.href = j.url;
      return null;
    }
    return j.error ?? "Checkout could not start. Please try again.";
  } catch {
    return "Checkout could not start. Please try again.";
  }
}

// The two plans with a Monthly / Yearly switch (RiftCompare's PremiumPricingCards).
// Signed out: the button goes to sign-in and back here with ?go=<tier>-<interval>,
// which starts checkout on return. Signed in: straight to Stripe Checkout.
export function PricingCards({ checkoutOpen }: { checkoutOpen: boolean }) {
  const { me, loaded } = useMe();
  const [interval, setInterval] = useState<Interval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const start = async (tier: Tier, iv: Interval) => {
    setBusy(`${tier}-${iv}`);
    setError(null);
    const err = await startCheckout(tier, iv, "premium-page");
    if (err) {
      setError(err);
      setBusy(null);
    }
  };

  // Back from sign-in with ?go=plus-year: pick up where the visitor left off.
  useEffect(() => {
    if (!loaded || started.current) return;
    const go = new URLSearchParams(window.location.search).get("go");
    const m = go ? /^(plus|premium)-(month|year)$/.exec(go) : null;
    if (!m) return;
    setInterval(m[2] as Interval);
    if (me.user && !me.tier && checkoutOpen) {
      started.current = true;
      void start(m[1] as Tier, m[2] as Interval);
    }
  }, [loaded, me.user, me.tier, checkoutOpen]);

  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full border border-ink-700 bg-ink-900 p-1" role="radiogroup" aria-label="Billing period">
        {INTERVALS.map((iv) => (
          <button key={iv} type="button" role="radio" aria-checked={interval === iv} onClick={() => setInterval(iv)} className={`rounded-full px-3 py-1.5 text-sm font-semibold sm:px-4 ${interval === iv ? "bg-brand-500 text-white" : "text-slate-300 hover:text-white"}`}>
            {iv === "month" ? "Monthly" : `Yearly · save ${annualSavingPct("premium")}%`}
          </button>
        ))}
      </div>
      {error ? <p className="mx-auto mt-4 max-w-xl rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-center text-sm text-red-300">{error}</p> : null}
      {/* Two columns at EVERY width (RiftCompare's PremiumPricingCards): both
          buttons sit in the first screen of a 390x844 phone, so the type and
          padding shrink below sm instead of the Premium card dropping below. */}
      <div className="mx-auto mt-4 grid max-w-4xl grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4">
        {TIERS.map((tier) => {
          const featured = tier === "premium";
          const current = me.tier === tier;
          const next = `/premium?go=${tier}-${interval}`;
          const btn = `block w-full rounded-lg px-2 py-2.5 text-center text-sm font-bold sm:px-4 sm:py-3 sm:text-base ${featured ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-white/10 text-white hover:bg-white/15"}`;
          return (
            <div key={tier} className={`relative flex flex-col rounded-2xl border p-3 sm:p-6 ${featured ? "border-brand-500 bg-brand-500/[0.06]" : "border-ink-700 bg-ink-900"}`}>
              {featured ? <span className="absolute -top-2.5 right-3 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white sm:left-6 sm:right-auto sm:-top-3 sm:px-3 sm:text-xs">Recommended</span> : null}
              <h2 className="text-lg font-extrabold text-white sm:text-2xl">{TIER_NAMES[tier]}</h2>
              <p className="mt-0.5 text-xs leading-snug text-slate-300 sm:mt-1 sm:text-sm">{PLAN_PITCH[tier]}</p>
              <p className="num mt-2 text-2xl font-extrabold text-white sm:mt-4 sm:text-4xl">
                {planPrice(tier, interval)}
                <span className="text-xs font-medium text-slate-400 sm:text-base">/{interval === "month" ? "mo" : "yr"}</span>
              </p>
              <p className="mt-0.5 min-h-4 text-[11px] leading-snug text-slate-400 sm:mt-1 sm:text-xs">{interval === "year" ? `${perMonth(tier)}/mo billed yearly` : `or ${planPrice(tier, "year")}/yr`}</p>
              <ul className="mt-2.5 flex-1 space-y-1 sm:mt-5 sm:space-y-2">
                {PLAN_FEATURES[tier].map((f) => (
                  <li key={f} className="flex gap-1.5 text-xs leading-snug text-slate-200 sm:gap-2 sm:text-[15px]">
                    <Icon name="check" className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400 sm:mt-0.5 sm:h-4 sm:w-4" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-3 sm:mt-6">
                {current ? (
                  <Link href="/account" className="block rounded-lg border border-ink-600 px-2 py-2.5 text-center text-sm font-semibold text-white sm:px-4 sm:py-3">
                    Your plan · manage it
                  </Link>
                ) : me.tier ? (
                  <Link href="/account" className={btn}>
                    Switch in your account
                  </Link>
                ) : !checkoutOpen ? (
                  <span className="block rounded-lg border border-ink-700 px-2 py-2.5 text-center text-sm text-slate-400 sm:px-4 sm:py-3">Opening soon</span>
                ) : me.user ? (
                  <button type="button" disabled={busy != null} onClick={() => start(tier, interval)} className={`${btn} disabled:opacity-60`}>
                    {busy === `${tier}-${interval}` ? "Opening checkout…" : `Get ${TIER_NAMES[tier]}`}
                  </button>
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(next)}`} rel="nofollow" onClick={() => firePlanClick("premium-page", tier)} className={btn}>
                    Get {TIER_NAMES[tier]}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-slate-300">Cancel anytime · secure checkout by Stripe</p>
      <p className="mt-1 text-center text-[11px] text-slate-500">Prices in US dollars. Cancel from your account; you keep access to the end of the period you paid for.</p>
    </div>
  );
}

export function ManageSubscriptionButton({ label = "Manage subscription" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/premium/portal", { method: "POST" });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setError(j.error ?? "Please try again.");
    } catch {
      setError("Please try again.");
    }
    setBusy(false);
  };
  return (
    <div>
      <button type="button" onClick={open} disabled={busy} className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60">
        {busy ? "Opening…" : label}
      </button>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        location.assign("/");
      }}
      className="rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-ink-800"
    >
      Sign out
    </button>
  );
}
