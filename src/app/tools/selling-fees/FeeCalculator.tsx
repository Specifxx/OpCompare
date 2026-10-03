"use client";

import { useMemo, useState } from "react";
import { useCountry } from "@/components/CountryProvider";
import { COUNTRIES, type Country } from "@/lib/country";
import { money } from "@/lib/format";
import { computeFees, defaultScheduleFor, FEE_SCHEDULES, parseRate, type FeeSchedule } from "@/lib/selling-fees";

// The selling-fee calculator (RiftCompare's FeeCalculator, with per-market
// schedules). Every field is editable; a schedule only fills in the rates we
// could confirm on the marketplace's own fee page (lib/selling-fees.ts), and
// the payout stays hidden until a commission is entered.

const amount = (v: string) => parseRate(v) ?? 0;
const str = (n: number | null) => (n == null ? "" : String(n));

export function FeeCalculator() {
  const { country } = useCountry();
  const [id, setId] = useState(() => defaultScheduleFor(country));
  const s = FEE_SCHEDULES.find((x) => x.id === id) ?? FEE_SCHEDULES[0];
  const [price, setPrice] = useState("20.00");
  const [shipCharged, setShipCharged] = useState("1.00");
  const [shipCost, setShipCost] = useState("0.80");
  const [commission, setCommission] = useState(str(s.commissionPct));
  const [processing, setProcessing] = useState(str(s.processingPct));
  const [fixed, setFixed] = useState(str(s.fixedFee));

  const pick = (next: FeeSchedule) => {
    setId(next.id);
    setCommission(str(next.commissionPct));
    setProcessing(str(next.processingPct));
    setFixed(str(next.fixedFee));
  };

  // The schedule's tier, cap and per-order step apply only while its own rates
  // are untouched: a seller who types their own rate gets plain arithmetic.
  const untouched = commission === str(s.commissionPct) && fixed === str(s.fixedFee);
  const calc = useMemo(
    () =>
      computeFees({
        price: amount(price),
        shipCharged: amount(shipCharged),
        shipCost: amount(shipCost),
        commissionPct: parseRate(commission),
        commissionBase: s.commissionBase,
        commissionCap: untouched ? s.commissionCap : null,
        tier: untouched ? s.tier : null,
        processingPct: amount(processing),
        fixedFee: amount(fixed),
        fixedFeeOver: untouched ? s.fixedFeeOver : null,
      }),
    [price, shipCharged, shipCost, commission, processing, fixed, s, untouched],
  );
  // Amounts are in the schedule's market currency (TCGplayer: US dollars).
  const cur: Country = s.id === "custom" ? country : s.market;
  // A deduction or a loss leads with U+2212 ("−$1.50"), never "$-1.50", and a
  // zero is never "−$0.00" (RiftCompare's formatMoney).
  const fmt = (n: number) => {
    const cents = Math.round(n * 100);
    return cents < 0 ? `\u2212${money(-cents, cur)}` : money(cents === 0 ? 0 : cents, cur);
  };

  const field = (label: string, value: string, set: (v: string) => void, hint?: string, placeholder?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-200">{label}</span>
      <input type="number" inputMode="decimal" min="0" step="0.01" value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} className="input" />
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="card-surface p-5">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Marketplace">
          {FEE_SCHEDULES.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={x.id === id}
              onClick={() => pick(x)}
              className={`chip min-h-9 px-3 ${x.id === id ? "bg-brand-500 text-white" : "border border-ink-700 bg-ink-850 text-slate-300 hover:border-ink-600"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-300">
          {s.note}{" "}
          {s.source.url ? (
            <a href={s.source.url} target="_blank" rel="noopener noreferrer" className="link">
              {s.source.label}
            </a>
          ) : null}
          {s.source.url ? <span className="text-slate-500"> (checked {s.checked})</span> : null}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field(`Sale price (${COUNTRIES[cur].currency})`, price, setPrice)}
          {field("Postage charged to the buyer", shipCharged, setShipCharged)}
          {field("Your actual postage cost", shipCost, setShipCost, "The mailer and stamp you pay for: it comes off your payout, not a fee.")}
          {field(
            "Commission %",
            commission,
            setCommission,
            s.commissionBase === "itemPlusShipping" ? "Charged on the item price plus the postage you charge." : "Charged on the item price.",
            "your rate",
          )}
          {field("Payment processing %", processing, setProcessing, "Charged on the item price plus postage.")}
          {field("Fixed fee per order", fixed, setFixed)}
        </div>
      </div>

      <div className="card-surface overflow-hidden" aria-live="polite">
        <div className="border-b border-ink-800 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Your payout</p>
          {calc.complete ? (
            <>
              <p className="num font-display text-4xl font-extrabold leading-none text-white sm:text-5xl">{fmt(calc.net)}</p>
              <p className="mt-1 text-xs text-slate-400">{calc.effectiveFeePct.toFixed(1)}% of the sale price went to fees and your own postage</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">Enter your commission</p>
              <p className="mt-1 text-xs text-slate-400">No payout is shown until the marketplace&apos;s largest fee is in. Use the rate from your seller account.</p>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-px bg-ink-800 sm:grid-cols-5">
          {(
            [
              ["Collected", calc.totalCollected],
              ["Commission", calc.complete ? -calc.commission : null],
              ["Processing", -calc.processing],
              ["Per-order fee", -calc.fixedFee],
              ["Your postage", -calc.shipCost],
            ] as [string, number | null][]
          ).map(([label, v]) => (
            <div key={label} className="bg-ink-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="num mt-1 text-base font-bold text-white md:text-lg">{v == null ? "—" : fmt(v)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
