"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { INTERVALS, PLAN_FEATURES, PLAN_PITCH, TIERS, TIER_NAMES, annualSavingPct, perMonth, planPrice, type Interval, type Tier } from "@/lib/plans";
import { useMe } from "@/lib/use-me";
import { Icon } from "./Icon";

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
    try {
      const r = await fetch("/api/premium/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier, interval: iv }) });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setError(j.error ?? "Checkout could not start. Please try again.");
    } catch {
      setError("Checkout could not start. Please try again.");
    }
    setBusy(null);
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
          <button key={iv} type="button" role="radio" aria-checked={interval === iv} onClick={() => setInterval(iv)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${interval === iv ? "bg-brand-500 text-white" : "text-slate-300 hover:text-white"}`}>
            {iv === "month" ? "Monthly" : `Yearly · save ${annualSavingPct("premium")}%`}
          </button>
        ))}
      </div>
      {error ? <p className="mx-auto mt-4 max-w-xl rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-center text-sm text-red-300">{error}</p> : null}
      <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
        {TIERS.map((tier) => {
          const featured = tier === "premium";
          const current = me.tier === tier;
          const next = `/premium?go=${tier}-${interval}`;
          return (
            <div key={tier} className={`relative flex flex-col rounded-2xl border p-6 ${featured ? "border-brand-500 bg-brand-500/[0.06]" : "border-ink-700 bg-ink-900"}`}>
              {featured ? <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white">Recommended</span> : null}
              <h2 className="text-2xl font-extrabold text-white">{TIER_NAMES[tier]}</h2>
              <p className="mt-1 text-sm text-slate-300">{PLAN_PITCH[tier]}</p>
              <p className="num mt-4 text-4xl font-extrabold text-white">
                {planPrice(tier, interval)}
                <span className="text-base font-medium text-slate-400">/{interval === "month" ? "mo" : "yr"}</span>
              </p>
              <p className="mt-1 h-5 text-xs text-slate-400">{interval === "year" ? `${perMonth(tier)}/mo billed yearly` : `or ${planPrice(tier, "year")}/yr`}</p>
              <ul className="mt-5 flex-1 space-y-2">
                {PLAN_FEATURES[tier].map((f) => (
                  <li key={f} className="flex gap-2 text-[15px] text-slate-200">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {current ? (
                  <Link href="/account" className="block rounded-lg border border-ink-600 px-4 py-3 text-center font-semibold text-white">
                    Your plan · manage it
                  </Link>
                ) : me.tier ? (
                  <Link href="/account" className="block rounded-lg bg-brand-500 px-4 py-3 text-center font-bold text-white hover:bg-brand-600">
                    Switch in your account
                  </Link>
                ) : !checkoutOpen ? (
                  <span className="block rounded-lg border border-ink-700 px-4 py-3 text-center text-sm text-slate-400">Opening soon</span>
                ) : me.user ? (
                  <button type="button" disabled={busy != null} onClick={() => start(tier, interval)} className={`w-full rounded-lg px-4 py-3 font-bold ${featured ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-white/10 text-white hover:bg-white/15"} disabled:opacity-60`}>
                    {busy === `${tier}-${interval}` ? "Opening checkout…" : `Get ${TIER_NAMES[tier]}`}
                  </button>
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(next)}`} rel="nofollow" className={`block rounded-lg px-4 py-3 text-center font-bold ${featured ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-white/10 text-white hover:bg-white/15"}`}>
                    Get {TIER_NAMES[tier]}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">Prices in US dollars. Cancel any time from your account; you keep access to the end of the period you paid for.</p>
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
