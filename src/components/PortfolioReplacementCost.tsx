"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import type { ReplacementPlan } from "@/lib/portfolio-replacement";
import PlanButton from "./PlanButton";
import { useCountry } from "./CountryProvider";

// "What would it cost to buy this collection again?" — RiftCompare's
// PortfolioReplacementCost, ported in wave 2 (2026-10-03).
//
// INTERIM COPY: until the tools track's Best Basket (with measured postage) is
// on main, the route prices every copy at its cheapest in-stock store listing
// and the panel says plainly that it is BEFORE POSTAGE. When the integrator
// swaps in planBasket, this panel takes RiftCompare's delivered copy back.
//
// The TOTAL is free; the store-by-store plan behind it is Premium. The route
// returns `plan` only to Premium; everyone else gets the Premium button.
//
// BEHIND A BUTTON, not computed on load: the route reads every in-stock listing
// for every card held, a much heavier query than the page's own.

interface Result {
  totalCents: number;
  shippingCents: number;
  topUpCents: number;
  savedCents: number;
  storeCount: number;
  requested: number;
  covered: number;
  beforePostage?: boolean;
  plan?: ReplacementPlan; // Premium only
  valuedCents: number;
  pricedHoldings: number;
  skippedHoldings: number;
}

export function PortfolioReplacementCost() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { country } = useCountry();
  const fmt = (c: number) => money(c, country);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/replacement");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't price your collection just now. Try again in a moment.");
        return;
      }
      setResult(data as Result);
      trackEvent("portfolio_replacement_priced", { holdings: (data as Result).pricedHoldings });
    } catch {
      setError("Couldn't reach the pricing service. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const plan = result?.plan;
  const gapCents = result ? result.totalCents - result.valuedCents : 0;
  const outOfStock = result ? result.requested - result.covered : 0;

  return (
    <section className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-white">📦 Replacement cost</h2>
        {result && (
          <button type="button" onClick={run} disabled={loading} className="btn-ghost text-xs">
            {loading ? "Pricing…" : "Re-price"}
          </button>
        )}
      </div>

      {!result && (
        <>
          <p className="mt-2 text-sm text-slate-400">
            Your collection value above is the cheapest <strong className="text-slate-200">item</strong> price for each card,
            adjusted for condition. This prices the whole collection the way you&apos;d actually re-buy it: every copy at the cheapest
            in-stock listing at a store we track, and how many stores that takes. Postage isn&apos;t included yet.
          </p>
          <div className="mt-3">
            <button type="button" onClick={run} disabled={loading} className="btn-primary text-sm">
              {loading ? "Pricing…" : "Price it →"}
            </button>
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      {result && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Cards, before postage" value={fmt(result.totalCents)} cls="text-gold" />
            <Stat label="Stores" value={String(result.storeCount)} />
            <Stat
              label="vs. listed value"
              value={`${gapCents >= 0 ? "+" : "−"}${fmt(Math.abs(gapCents))}`}
              cls={gapCents >= 0 ? "text-brand-400" : "text-rose-400"}
            />
          </div>

          <p className="text-sm text-slate-400">
            Re-buying the {result.covered} cop{result.covered === 1 ? "y" : "ies"} in stock today would take{" "}
            <strong className="text-slate-200">
              {result.storeCount} store{result.storeCount === 1 ? "" : "s"}
            </strong>{" "}
            at <strong className="text-slate-200">{fmt(result.totalCents)}</strong> before postage.
          </p>

          {plan && plan.stores.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-1 font-semibold">Store</th>
                    <th className="pb-1 text-right font-semibold">Cards</th>
                    <th className="pb-1 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {plan.stores.map((s) => (
                    <tr key={s.key} className="border-t border-ink-800">
                      <td className="py-1.5 font-semibold text-white">{s.name}</td>
                      <td className="py-1.5 text-right">{s.lines.reduce((n, l) => n + l.qty, 0)}</td>
                      <td className="py-1.5 text-right">{fmt(s.subtotalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.covered > 0 && !plan && (
            <p className="text-sm">
              <span className="text-slate-400">Which store to buy each card from is part of Premium. </span>
              <PlanButton tier="premium" surface="gate:replacement-plan" className="font-semibold text-gold underline-offset-2 hover:underline">
                See the store-by-store plan with Premium →
              </PlanButton>
            </p>
          )}

          <div className="space-y-1.5 text-[11px] text-slate-600">
            <p>
              Replacement cost is what re-buying costs, not what your cards are worth — two different numbers. It can land lower: a card
              nothing stocks today isn&apos;t in it at all, though it still counts towards the value above. Stores sell what they have,
              so a replacement is priced at the listed condition rather than yours. Store and TCGplayer listings only: eBay is left out
              because its postage is quoted per listing. Postage is not included yet: each store charges it once per order.
              {outOfStock > 0 && (
                <>
                  {" "}
                  {outOfStock} cop{outOfStock === 1 ? "y is" : "ies are"} not in stock at any tracked store right now and{" "}
                  {outOfStock === 1 ? "is" : "are"} left out of the total.
                </>
              )}
              {result.skippedHoldings > 0 && (
                <>
                  {" "}
                  Priced on your {result.pricedHoldings} most valuable cards; {result.skippedHoldings} cheaper{" "}
                  {result.skippedHoldings === 1 ? "one is" : "ones are"} not included.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-lg bg-ink-900 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-base font-extrabold ${cls ?? "text-white"}`}>{value}</div>
    </div>
  );
}
