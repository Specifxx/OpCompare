"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/format-currency";
import { convertUsdCents, toUsdCents } from "@/lib/fx";
import { currencyOf } from "@/lib/country";
import { outboundRel } from "@/lib/affiliate";
import { trackEvent } from "@/lib/analytics";
import { useCountry } from "@/components/CountryProvider";
import { CardArt } from "@/components/CardTile";
import { POOL_LABEL, POOL_ORDER, type PoolKey } from "@/lib/box-ev";
import { MAX_PULL_LINES, MAX_PULL_QTY, parseFragment, shareFragment, summarisePulls, type PullLine } from "@/lib/pull-tracker";
import type { SimCard } from "@/lib/pack-sim";
import type { PackSimProps } from "@/components/PackSim";

// The pull tracker (lib/pull-tracker.ts has the why). Everything is the
// visitor's own: pulls live in this browser, and a shared link carries them in
// its #fragment, which never reaches the server. Prices are TCGplayer US market,
// converted here once, as on the pack simulator and Box EV.

const storeKey = (slug: string) => `oc_pulls_${slug}`;
type Row = SimCard & { pool: PoolKey };
// Hits first: that is what people open a box for and what they log first.
const FILTER_ORDER: PoolKey[] = ["Manga", "Treasure", "SP", "Parallel", "SecretRare", "SuperRare", "Leader", "Rare", "Uncommon", "Common"];

export function PullTracker({ sets, set }: PackSimProps) {
  const router = useRouter();
  const { country } = useCountry();
  const currency = currencyOf(country);
  const money = (usd: number) => formatMoney(convertUsdCents(usd, currency), currency);
  const offer = set.offers[country] ?? null;

  const rows = useMemo<Row[]>(
    () => POOL_ORDER.flatMap((p) => (set.pools[p] ?? []).map((c) => ({ ...c, pool: p }))),
    [set.pools],
  );
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const available = FILTER_ORDER.filter((p) => set.pools[p]?.length);

  const [lines, setLines] = useState<PullLine[]>([]);
  const [paid, setPaid] = useState("");
  const [filter, setFilter] = useState<"hits" | PoolKey>("hits");
  const [q, setQ] = useState("");
  const [fromLink, setFromLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const restored = useRef(false);

  // A shared link wins; otherwise this set's pulls from the last visit.
  useEffect(() => {
    const shared = parseFragment(window.location.hash);
    if (shared) {
      setLines(shared.lines.filter((l) => byId.has(l.id)));
      if (shared.paidCents) setPaid((shared.paidCents / 100).toFixed(2));
      setFromLink(true);
      trackEvent("pull_tracker_shared_open", { set_id: set.code });
    } else {
      try {
        const s = JSON.parse(localStorage.getItem(storeKey(set.slug)) || "null") as { lines?: PullLine[]; paid?: string } | null;
        if (Array.isArray(s?.lines)) setLines(s!.lines.filter((l) => byId.has(l.id)).slice(0, MAX_PULL_LINES));
        if (typeof s?.paid === "string") setPaid(s.paid);
      } catch { /* storage off: start empty */ }
    }
    restored.current = true;
    trackEvent("pull_tracker_open", { set_id: set.code });
  }, [set.slug, set.code, byId]);

  useEffect(() => {
    if (!restored.current || fromLink) return;
    try { localStorage.setItem(storeKey(set.slug), JSON.stringify({ lines, paid })); } catch { /* full */ }
  }, [lines, paid, set.slug, fromLink]);

  // Start "what you paid" at the cheapest real box here, if nothing is typed.
  useEffect(() => {
    if (restored.current && !paid && offer) setPaid((offer.priceCents / 100).toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.priceCents]);

  const add = (id: number) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: Math.min(MAX_PULL_QTY, l.qty + 1) } : l));
      return [{ id, qty: 1 }, ...ls].slice(0, MAX_PULL_LINES);
    });
    trackEvent("pull_add", { set_id: set.code });
  };
  const bump = (id: number, d: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.min(MAX_PULL_QTY, l.qty + d)) } : l)).filter((l) => l.qty > 0));

  const sum = summarisePulls(lines, (id) => byId.get(id)?.usdCents ?? null);
  const paidCents = (() => { const v = Number(paid); return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null; })();
  const paidUsd = paidCents != null ? toUsdCents(paidCents, currency) : null;
  const diffUsd = paidUsd != null ? sum.totalUsdCents - paidUsd : null;
  const best = sum.bestId != null ? byId.get(sum.bestId) ?? null : null;

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = rows;
    if (term) list = rows.filter((r) => r.name.toLowerCase().includes(term) || (r.number ?? "").toLowerCase().includes(term));
    else if (filter === "hits") list = rows.filter((r) => r.pool !== "Common" && r.pool !== "Uncommon" && r.pool !== "Rare");
    else list = rows.filter((r) => r.pool === filter);
    return [...list].sort((a, b) => (b.usdCents ?? -1) - (a.usdCents ?? -1)).slice(0, 48);
  }, [rows, q, filter]);

  const share = async () => {
    const url = `${window.location.origin}/tools/pull-tracker/${set.slug}#${shareFragment(lines, paidCents, currency)}`;
    const text = `My ${set.code} pulls are worth ${money(sum.totalUsdCents)}${paidCents ? ` from a ${formatMoney(paidCents, currency)} buy` : ""}.`;
    trackEvent("pull_tracker_share", { set_id: set.code });
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* dismissed */ }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="card-surface flex flex-wrap items-end gap-3 p-4">
          <label className="block min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Set</span>
            <select value={set.slug} onChange={(e) => router.push(`/tools/pull-tracker/${e.target.value}`)} className="input">
              {sets.map((s) => <option key={s.slug} value={s.slug}>{s.code} · {s.name}</option>)}
            </select>
          </label>
          <label className="block min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-400">Find a card</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or number" className="input" />
          </label>
        </div>
        {!q && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(["hits", ...available] as const).map((p) => (
              <button key={p} type="button" onClick={() => setFilter(p)} className={`rounded-full border px-2.5 py-1 ${filter === p ? "border-brand-500 bg-brand-500/15 text-white" : "border-ink-700 text-slate-400 hover:text-white"}`}>
                {p === "hits" ? "Hits" : POOL_LABEL[p]}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {results.map((r) => {
            const n = lines.find((l) => l.id === r.id)?.qty ?? 0;
            return (
              <button key={r.id} type="button" onClick={() => add(r.id)} className={`relative overflow-hidden rounded-lg border-2 text-left ${n ? "border-brand-500" : "border-transparent"}`} title={`Add ${r.name}`}>
                <CardArt id={r.id} hasImage={r.hasImage} alt={r.name} className="rounded-none" />
                {n > 0 && <span className="num absolute right-1 top-1 rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">×{n}</span>}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent px-1.5 pb-1 pt-5 text-center">
                  <span className="block truncate text-[10px] font-bold text-white">{r.name}</span>
                  <span className="block text-[10px] text-slate-300">{POOL_LABEL[r.pool]} · {r.usdCents ? money(r.usdCents) : "bulk"}</span>
                </span>
              </button>
            );
          })}
          {results.length === 0 && <p className="col-span-full p-6 text-center text-sm text-slate-500">No card matches.</p>}
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="card-surface p-4">
          {fromLink && <p className="mb-2 text-xs text-gold">Someone shared these pulls with you. Tap cards to start your own.</p>}
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Your pulls are worth</div>
          <div className="num font-display text-4xl font-extrabold leading-none text-white">{money(sum.totalUsdCents)}</div>
          <div className="mt-1 text-xs text-slate-500">{sum.copies} {sum.copies === 1 ? "card" : "cards"}{sum.unpriced ? ` · ${sum.unpriced} bulk` : ""}</div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-400">What you paid ({currency})</span>
            <input type="number" min="0" step="0.01" value={paid} onChange={(e) => { setPaid(e.target.value); setFromLink(false); }} className="input" />
          </label>
          {diffUsd != null && sum.copies > 0 && (
            <p className={`mt-2 text-sm font-semibold ${diffUsd >= 0 ? "text-up" : "text-down"}`}>
              {diffUsd >= 0 ? `Up ${money(diffUsd)} on what you paid` : `${money(-diffUsd)} under what you paid`}
            </p>
          )}
          {best && <p className="mt-1 text-xs text-slate-400">Best pull: <Link href={`/card/${best.slug}`} className="text-brand-400 hover:underline">{best.name}</Link> ({money(best.usdCents ?? 0)})</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={share} disabled={!lines.length} className="btn-primary text-sm disabled:opacity-50">{copied ? "Link copied" : "Share my pulls"}</button>
            {lines.length > 0 && <button type="button" onClick={() => { setLines([]); setFromLink(false); }} className="btn-ghost text-sm">Clear</button>}
          </div>
        </div>

        {lines.length > 0 && (
          <ul className="card-surface max-h-80 divide-y divide-ink-800 overflow-y-auto p-2 text-sm">
            {lines.map((l) => {
              const r = byId.get(l.id);
              if (!r) return null;
              return (
                <li key={l.id} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-slate-200">{r.name} <span className="text-xs text-slate-500">{POOL_LABEL[r.pool]}</span></span>
                  <span className="num text-xs text-slate-400">{r.usdCents ? money(r.usdCents * l.qty) : "bulk"}</span>
                  <button type="button" onClick={() => bump(l.id, -1)} className="h-7 w-7 rounded border border-ink-700 text-slate-300" aria-label={`One fewer ${r.name}`}>−</button>
                  <span className="num w-5 text-center">{l.qty}</span>
                  <button type="button" onClick={() => bump(l.id, 1)} className="h-7 w-7 rounded border border-ink-700 text-slate-300" aria-label={`One more ${r.name}`}>+</button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="card-surface p-4 text-sm text-slate-300">
          {offer ? (
            <>
              The cheapest in-stock {set.code} box we track is <span className="num font-bold text-white">{formatMoney(offer.priceCents, currency)}</span> at {offer.retailerName}.
              <a href={offer.href} target="_blank" rel={outboundRel()} data-retailer={offer.retailer} data-page="pull_tracker" className="btn-primary mt-3 block text-center text-sm">
                Buy at {offer.retailerName} →
              </a>
            </>
          ) : (
            <>Compare {set.code} box prices across every store we track before your next one.</>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <Link href={offer ? `/sealed/${offer.boxSlug}` : "/sealed"} className="text-brand-400 hover:underline">Compare box prices</Link>
            <Link href={`/tools/pack-sim/${set.slug}`} className="text-brand-400 hover:underline">Open a virtual box</Link>
            <Link href={`/sets/${set.slug}`} className="text-brand-400 hover:underline">Buy the singles</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
