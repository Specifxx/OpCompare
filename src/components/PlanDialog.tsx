"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { INTERVALS, PLAN_PITCH, TIERS, TIER_NAMES, annualSavingPct, perMonth, planPrice, type Interval, type Tier } from "@/lib/plans";
import { useMe } from "@/lib/use-me";
import { Icon } from "./Icon";
import { ManageSubscriptionButton, startCheckout } from "./PricingCards";
import { TierComparisonTable } from "./TierComparisonTable";

// The Plus/Premium dialog (RiftCompare's PremiumDialog), opened from any wall
// through PlanProvider. Tier toggle (opens on the LOWEST tier that unlocks the
// wall), Monthly/Yearly toggle, the price from lib/plans.ts, the shared
// comparison table, and one button whose state follows the visitor:
//   member            → "You're on Plus/Premium", billing portal (Plus → Premium
//                       is a prorated switch there)
//   Stripe not set up → "Opening soon", exactly as /premium shows it
//   signed out        → sign in, then /premium?go=<tier>-<interval> starts
//                       checkout on return (PricingCards' ?go= logic)
//   signed in         → straight to Stripe Checkout (PricingCards' startCheckout)
const toggle = (on: boolean) => `flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${on ? "bg-ink-700 text-white" : "text-slate-400 hover:text-white"}`;

export function PlanDialog({ initialTier, surface, checkoutOpen, onClose }: { initialTier: Tier; surface: string; checkoutOpen: boolean; onClose: () => void }) {
  const { me, loaded } = useMe();
  const [tier, setTier] = useState<Tier>(initialTier);
  const [interval, setInterval] = useState<Interval>("month");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Modal manners: scroll lock, Escape, focus in and back out, and the
  // body[data-oc-dialog] flag the corner nudges yield to (lib/nudge-runtime.ts).
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.ocDialog = "1";
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      delete document.body.dataset.ocDialog;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const checkout = async () => {
    setBusy(true);
    setError(null);
    const err = await startCheckout(tier, interval, surface);
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  const save = annualSavingPct(tier);
  const next = `/premium?go=${tier}-${interval}`;

  return (
    <div className="fixed inset-0 z-modal overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title">
      <button type="button" tabIndex={-1} aria-label="Close" className="fixed inset-0 h-full w-full cursor-default bg-black/70" onClick={onClose} />
      <div className="pointer-events-none relative flex min-h-full items-center justify-center p-3 sm:p-6">
        <div ref={panel} className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-700 bg-ink-950/60 py-1 pl-5 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">OP Compare</span>
              <span className="rounded border border-straw/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-straw">{TIER_NAMES[tier]}</span>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="tap-icon rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-5">
            <h2 id="plan-dialog-title" className="text-lg font-extrabold text-white">
              Never overpay for a One Piece card
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Plus and Premium are ad-free. Plus shows every Deal Finder deal in all six markets; Premium also plans which stores to buy your list from. Comparing prices stays free.
            </p>

            <div className="mt-4 max-h-[32vh] overflow-y-auto rounded-lg border border-ink-800">
              <TierComparisonTable compact />
            </div>

            <div className="mt-4">
              {!loaded ? (
                <div className="h-28 animate-pulse rounded-lg bg-ink-800" />
              ) : me.tier ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-straw">You&apos;re on {TIER_NAMES[me.tier]}</p>
                  {me.tier === "plus" ? (
                    <>
                      <p className="mt-1 text-xs text-slate-400">Premium adds the Buy List Planner. Switch plans in the billing portal; the difference is prorated.</p>
                      <div className="mt-3 flex justify-center">
                        <ManageSubscriptionButton label="Switch to Premium" />
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <Link href="/tools/deal-finder" onClick={onClose} className="btn-ghost text-sm">
                        Deal Finder →
                      </Link>
                      <Link href="/tools/buy-list" onClick={onClose} className="btn-ghost text-sm">
                        Buy List Planner →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-2 flex gap-1 rounded-lg border border-ink-700 bg-ink-950/50 p-1" role="radiogroup" aria-label="Plan">
                    {TIERS.map((t) => (
                      <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => setTier(t)} className={toggle(tier === t)}>
                        {TIER_NAMES[t]}
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 flex gap-1 rounded-lg border border-ink-700 bg-ink-950/50 p-1" role="radiogroup" aria-label="Billing period">
                    {INTERVALS.map((iv) => (
                      <button key={iv} type="button" role="radio" aria-checked={interval === iv} onClick={() => setInterval(iv)} className={toggle(interval === iv)}>
                        {iv === "month" ? "Monthly" : (
                          <>
                            Yearly<span className="ml-1 text-[10px] font-extrabold text-emerald-400">−{save}%</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 text-center">
                    <p className="flex items-baseline justify-center gap-1">
                      <span className="num text-3xl font-extrabold text-white">{planPrice(tier, interval)}</span>
                      <span className="text-sm text-slate-400">/{interval === "month" ? "mo" : "yr"}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{PLAN_PITCH[tier]}</p>
                    {interval === "month" ? (
                      <button type="button" onClick={() => setInterval("year")} className="mt-1 text-[11px] font-semibold text-brand-400 hover:underline">
                        or {perMonth(tier)}/mo billed yearly →
                      </button>
                    ) : (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-400">{perMonth(tier)}/mo, billed once a year</p>
                    )}
                  </div>
                  {!checkoutOpen ? (
                    <>
                      <span data-autofocus tabIndex={-1} className="block rounded-lg border border-ink-700 px-4 py-2.5 text-center text-sm text-slate-400">
                        Opening soon
                      </span>
                      <p className="mt-2 text-center text-[11px] text-slate-500">Subscriptions aren&apos;t open yet. Everything free stays free meanwhile.</p>
                    </>
                  ) : !me.user ? (
                    <>
                      <Link data-autofocus href={`/login?next=${encodeURIComponent(next)}`} rel="nofollow" className="btn-primary w-full">
                        Sign in to continue to checkout
                      </Link>
                      <p className="mt-2 text-center text-[11px] text-slate-500">Your account is free and needs no card · cancel your subscription anytime.</p>
                    </>
                  ) : (
                    <>
                      <button data-autofocus type="button" onClick={checkout} disabled={busy} className="btn-primary w-full">
                        {busy ? "Opening checkout…" : interval === "year" ? `Get ${TIER_NAMES[tier]} yearly · ${planPrice(tier, "year")} →` : `Get ${TIER_NAMES[tier]} · ${planPrice(tier, "month")}/mo →`}
                      </button>
                      <p className="mt-2 text-center text-[11px] text-slate-500">Cancel anytime · secure checkout by Stripe</p>
                      {error ? (
                        <p role="alert" className="mt-2 text-center text-xs text-red-300">
                          {error}
                        </p>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </div>
            <p className="mt-4 text-center text-xs">
              <Link href="/premium" onClick={onClose} className="text-slate-500 hover:text-slate-300 hover:underline">
                See all plans &amp; details →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
