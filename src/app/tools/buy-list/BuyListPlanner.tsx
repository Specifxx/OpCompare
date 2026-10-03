"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readWatchlist, type WatchItem } from "@/components/WatchButton";
import { useCountry } from "@/components/CountryProvider";
import { money } from "@/lib/format";
import { outboundRel } from "@/lib/affiliate";
import { MIN_CONDITIONS, MIN_CONDITION_LABEL, MIN_CONDITION_PHRASE, parseMinCondition, type MinCondition } from "@/lib/buy-list-condition";

// Premium's floor starts on "LP or better" and remembers the last choice in
// this browser (RiftCompare's Best Basket); a free total is any condition.
const FLOOR_KEY = "oc_buylist_floor";

interface Pick {
  slug: string;
  name: string;
  priceCents: number;
  url: string;
}
interface Basket {
  source: string;
  store: string;
  picks: Pick[];
  totalCents: number;
  missing?: string[];
}
interface FullPlan {
  mode: "plan";
  count: number;
  minCondition: MinCondition;
  unmatched: string[];
  split: Basket[];
  splitTotalCents: number;
  single: Basket[];
  unavailable: string[];
}
interface TotalOnly {
  mode: "total";
  count: number;
  minCondition: MinCondition;
  unmatched: string[];
  splitTotalCents: number;
  stores: number;
  priced: number;
  unavailable: number;
  /** Items whose cheapest copy is LP or worse, and items priced at TCGplayer's any-condition low. */
  played: number;
  unknown: number;
}

type Source = "paste" | "watchlist";

export function BuyListPlanner({ place, premium, initialList }: { place: string; premium: boolean; initialList: string }) {
  const { country } = useCountry();
  const [list, setList] = useState<WatchItem[] | null>(null);
  const [source, setSource] = useState<Source>(initialList ? "paste" : "watchlist");
  const [text, setText] = useState(initialList);
  const [floor, setFloor] = useState<MinCondition>(premium ? "lp" : "any");
  const [plan, setPlan] = useState<FullPlan | TotalOnly | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const w = readWatchlist();
    setList(w);
    if (!initialList && !w.length) setSource("paste");
    if (premium) {
      try {
        const saved = window.localStorage.getItem(FLOOR_KEY);
        if (saved) setFloor(parseMinCondition(saved));
      } catch {
        /* storage blocked: keep the default */
      }
    }
  }, [initialList, premium]);

  const run = async (nextFloor = floor) => {
    if (source === "watchlist" ? !list?.length : !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        source === "watchlist"
          ? { source, minCondition: nextFloor, items: (list ?? []).map((w) => ({ slug: w.slug, kind: w.kind })) }
          : { source, minCondition: nextFloor, text };
      const r = await fetch("/api/buy-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "Please try again.");
      else setPlan(j as FullPlan | TotalOnly);
    } catch {
      setError("Please try again.");
    }
    setBusy(false);
  };

  if (list == null) return null;
  const Row = ({ p, b }: { p: Pick; b: Basket }) => (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate text-slate-200">{p.name}</span>
      <a
        href={p.url}
        target="_blank"
        rel={outboundRel()}
        data-retailer={b.source === "tcgplayer" ? "tcgplayer" : b.source.replace("store:", "")}
        data-page="buy_list"
        data-card={p.slug}
        data-surface="buy_list"
        className="num shrink-0 font-semibold text-white hover:text-brand-400"
      >
        {money(p.priceCents, country)} →
      </a>
    </li>
  );
  const canRun = source === "watchlist" ? list.length > 0 : text.trim().length > 0;
  return (
    <div className="mt-6">
      <div className="card-surface p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="What to plan">
          {(["paste", "watchlist"] as Source[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={source === s}
              onClick={() => {
                setSource(s);
                setPlan(null);
              }}
              className={`chip min-h-9 px-3 ${source === s ? "bg-brand-500 text-white" : "border border-ink-700 bg-ink-850 text-slate-300 hover:border-ink-600"}`}
            >
              {s === "paste" ? "Paste a list" : `My watchlist (${list.length})`}
            </button>
          ))}
        </div>
        {source === "paste" ? (
          <div className="mt-3">
            <label htmlFor="bl-paste" className="mb-1 block text-sm font-semibold text-white">
              Your decklist or card list
            </label>
            <textarea
              id="bl-paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder={"4xOP01-016\n4 Nami (OP01-016)\n…"}
              className="input font-mono sm:text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              The same formats as the{" "}
              <Link href="/deck" className="text-brand-400 hover:underline">
                deck price calculator
              </Link>
              . Cards only; plan sealed products from your watchlist.
            </p>
          </div>
        ) : list.length ? (
          <p className="mt-3 text-sm text-slate-300">
            {list.length} watched item{list.length === 1 ? "" : "s"}.{" "}
            <Link href="/watchlist" className="text-brand-400 hover:underline">
              Edit watchlist
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-300">
            Your watchlist is empty. Tap the heart on any{" "}
            <Link href="/browse" className="text-brand-400 hover:underline">
              card
            </Link>{" "}
            or{" "}
            <Link href="/sealed" className="text-brand-400 hover:underline">
              sealed product
            </Link>{" "}
            to add it, or paste a list instead.
          </p>
        )}
        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Minimum condition</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {MIN_CONDITIONS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={floor === m}
                disabled={!premium}
                onClick={() => {
                  setFloor(m);
                  try {
                    window.localStorage.setItem(FLOOR_KEY, m);
                  } catch {
                    /* storage blocked */
                  }
                  if (plan) run(m);
                }}
                className={`chip min-h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50 ${floor === m ? "bg-gold text-ink-950" : "border border-ink-700 bg-ink-850 text-slate-300 hover:border-ink-600"}`}
              >
                {MIN_CONDITION_LABEL[m]}
              </button>
            ))}
          </div>
          {!premium ? <p className="mt-1.5 text-xs text-slate-400">Setting a minimum condition is part of Premium. Your free total counts each card&apos;s cheapest copy in any condition.</p> : null}
        </fieldset>
        <button type="button" onClick={() => run()} disabled={busy || !canRun} className="btn-primary mt-4 w-full sm:w-auto disabled:opacity-60">
          {busy ? "Planning…" : `Plan it in ${place}`}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {plan?.unmatched.length ? (
        <p className="mt-3 text-sm text-gold">
          Not matched, so not planned: <span className="font-mono text-xs text-slate-300">{plan.unmatched.join(" · ")}</span>
        </p>
      ) : null}
      {plan?.mode === "total" ? (
        <section className="card-surface mt-6 p-5" aria-label="Your total">
          <p className="rb-eyebrow text-slate-500">Your total</p>
          <p className="num mt-1 text-4xl font-extrabold text-accent">{money(plan.splitTotalCents, country)}</p>
          <p className="mt-1 text-sm text-slate-300">
            {plan.priced} of {plan.count} item{plan.count === 1 ? "" : "s"} at the cheapest in-stock listing in {place} ({MIN_CONDITION_PHRASE[plan.minCondition]}), across{" "}
            {plan.stores} store{plan.stores === 1 ? "" : "s"}, before postage.
            {plan.unavailable ? ` ${plan.unavailable} not in stock anywhere in ${place} at this condition.` : ""}
          </p>
          {plan.played || plan.unknown ? (
            <p className="mt-1 text-sm text-gold">
              {[
                plan.played ? `${plan.played} of the cheapest copies ${plan.played === 1 ? "is" : "are"} played (LP or worse)` : null,
                plan.unknown ? `${plan.unknown} ${plan.unknown === 1 ? "is" : "are"} TCGplayer's cheapest listing, which can be any condition` : null,
              ]
                .filter(Boolean)
                .join("; ")}
              .
            </p>
          ) : null}
          {!premium ? <p className="mt-2 text-xs text-slate-400">Which stores, and the cheapest single-store order, are part of Premium.</p> : null}
        </section>
      ) : plan?.mode === "plan" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="text-lg font-bold text-white">Cheapest split</h2>
            <p className="text-sm text-slate-400">
              Each item from its cheapest in-stock store ({MIN_CONDITION_PHRASE[plan.minCondition]}):{" "}
              <span className="num font-semibold text-white">{money(plan.splitTotalCents, country)}</span> across {plan.split.length} store
              {plan.split.length === 1 ? "" : "s"}.
            </p>
            {plan.split.map((b) => (
              <div key={b.source} className="mt-4">
                <p className="flex justify-between text-sm font-semibold text-white">
                  <span>{b.store}</span>
                  <span className="num">{money(b.totalCents, country)}</span>
                </p>
                <ul className="divide-y divide-ink-800">
                  {b.picks.map((p) => (
                    <Row key={p.slug} p={p} b={b} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="text-lg font-bold text-white">Best single stores</h2>
            <p className="text-sm text-slate-400">One order, one postage: the stores that stock the most of your list, cheapest first.</p>
            {plan.single.map((b, i) => (
              <details key={b.source} className="mt-3 rounded-lg border border-ink-800 p-3" open={i === 0}>
                <summary className="flex cursor-pointer justify-between gap-3 text-sm">
                  <span className="font-semibold text-white">{b.store}</span>
                  <span className="text-slate-300">
                    {b.picks.length} of {plan.count - plan.unavailable.length} · <span className="num font-semibold text-white">{money(b.totalCents, country)}</span>
                  </span>
                </summary>
                <ul className="mt-2 divide-y divide-ink-800">
                  {b.picks.map((p) => (
                    <Row key={p.slug} p={p} b={b} />
                  ))}
                </ul>
                {b.missing?.length ? <p className="mt-2 text-xs text-slate-500">Not stocked: {b.missing.join(", ")}</p> : null}
              </details>
            ))}
          </section>
          {plan.unavailable.length ? (
            <p className="text-sm text-slate-400 lg:col-span-2">
              No store in {place} has these in stock at this condition today: {plan.unavailable.join(", ")}.
            </p>
          ) : null}
          <p className="text-xs text-slate-500 lg:col-span-2">A line of several copies is priced at the store&apos;s price for each; stores publish stock, not quantities.</p>
        </div>
      ) : null}
    </div>
  );
}
