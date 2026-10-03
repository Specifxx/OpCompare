"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readWatchlist, type WatchItem } from "@/components/WatchButton";
import { useCountry } from "@/components/CountryProvider";
import { money } from "@/lib/format";
import { outboundRel } from "@/lib/affiliate";

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
interface Plan {
  count: number;
  split: Basket[];
  splitTotalCents: number;
  single: Basket[];
  unavailable: string[];
}

export function BuyListPlanner({ place }: { place: string }) {
  const { country } = useCountry();
  const [list, setList] = useState<WatchItem[] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setList(readWatchlist()), []);

  const run = async () => {
    if (!list?.length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/buy-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: list.map((w) => ({ slug: w.slug, kind: w.kind })) }) });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "Please try again.");
      else setPlan(j as Plan);
    } catch {
      setError("Please try again.");
    }
    setBusy(false);
  };

  if (list == null) return null;
  if (!list.length) {
    return (
      <div className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-6 text-center text-slate-300">
        Your watchlist is empty. Tap the heart on any <Link href="/browse" className="text-brand-400 underline">card</Link> or{" "}
        <Link href="/sealed" className="text-brand-400 underline">sealed product</Link> to add it, then come back.
      </div>
    );
  }
  // data-retailer: the basket's store key, as on the price board (lib/board.ts retailerSubId).
  const Row = ({ p, source }: { p: Pick; source: string }) => (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate text-slate-200">{p.name}</span>
      <a href={p.url} target="_blank" rel={outboundRel()} data-retailer={source === "tcgplayer" ? "tcgplayer" : source.replace("store:", "")} data-page="buy-list" data-card={p.slug} data-surface="buy_list" className="num shrink-0 font-semibold text-white hover:text-brand-400">
        {money(p.priceCents, country)} →
      </a>
    </li>
  );
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={busy} className="rounded-lg bg-brand-500 px-5 py-3 font-bold text-white hover:bg-brand-600 disabled:opacity-60">
          {busy ? "Planning…" : `Plan my ${list.length} watched item${list.length === 1 ? "" : "s"} in ${place}`}
        </button>
        <Link href="/watchlist" className="text-sm text-slate-300 underline">
          Edit watchlist
        </Link>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {plan ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="text-lg font-bold text-white">Cheapest split</h2>
            <p className="text-sm text-slate-400">
              Each item from its cheapest in-stock store: <span className="num font-semibold text-white">{money(plan.splitTotalCents, country)}</span> across {plan.split.length} store
              {plan.split.length === 1 ? "" : "s"}.
            </p>
            {plan.split.map((b) => (
              <div key={b.source} className="mt-4">
                <p className="flex justify-between text-sm font-semibold text-white">
                  <span>{b.store}</span>
                  <span className="num">{money(b.totalCents, country)}</span>
                </p>
                <ul className="divide-y divide-ink-800">{b.picks.map((p) => <Row key={p.slug} p={p} source={b.source} />)}</ul>
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
                <ul className="mt-2 divide-y divide-ink-800">{b.picks.map((p) => <Row key={p.slug} p={p} source={b.source} />)}</ul>
                {b.missing?.length ? <p className="mt-2 text-xs text-slate-500">Not stocked: {b.missing.join(", ")}</p> : null}
              </details>
            ))}
          </section>
          {plan.unavailable.length ? (
            <p className="text-sm text-slate-400 lg:col-span-2">No store in {place} has these in stock today: {plan.unavailable.join(", ")}.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
