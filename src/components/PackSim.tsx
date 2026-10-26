"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format-currency";
import { convertUsdCents, toUsdCents } from "@/lib/fx";
import { currencyOf } from "@/lib/country";
import { outboundRel } from "@/lib/affiliate";
import { trackEvent } from "@/lib/analytics";
import { useCountry } from "@/components/CountryProvider";
import { CardArt } from "@/components/CardTile";
import { POOL_LABEL, type PoolKey } from "@/lib/box-ev";
import { bestPull, dealPack, packValueUsdCents, type DealtCard, type SimPools } from "@/lib/pack-sim";
import type { BoxEvOffer } from "@/components/BoxEvCalculator";

// Pack opening simulator (RiftCompare's PackSim, for One Piece). Deals a pack
// from the set's real card pool at the Box EV calculator's community-estimate
// rates (lib/pack-sim.ts), reveals it card by card with the rare slot last, and
// prices every card at its TCGplayer US market price, converted here once for
// the visitor's currency: the server render is country-agnostic. "Open a box"
// deals a whole box and sets what it pulled beside a real box's price, which is
// the honest answer to "should I buy one".

const BEST_KEY = "oc_packsim_best";
const HIT_POOLS: ReadonlySet<PoolKey> = new Set(["SuperRare", "SecretRare", "Leader", "Parallel", "SP", "Treasure", "Manga"]);

const POOL_COLOR: Record<PoolKey, string> = {
  Common: "#64748b",
  Uncommon: "#94a3b8",
  Rare: "#38bdf8",
  Leader: "#f87171",
  SuperRare: "#a78bfa",
  SecretRare: "#f5a524",
  Parallel: "#2dd4bf",
  SP: "#f472b6",
  Treasure: "#facc15",
  Manga: "#fb923c",
};

export interface PackSimProps {
  sets: { code: string; slug: string; name: string }[];
  set: { code: string; slug: string; name: string; packs: number; pools: SimPools; offers: Partial<Record<string, BoxEvOffer>> };
}

export function PackSim({ sets, set }: PackSimProps) {
  const router = useRouter();
  const { country } = useCountry();
  const currency = currencyOf(country);
  const money = (usdCents: number) => formatMoney(convertUsdCents(usdCents, currency), currency);
  const offer = set.offers[country] ?? null;

  const [pack, setPack] = useState<DealtCard[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [box, setBox] = useState<DealtCard[][] | null>(null);
  const [session, setSession] = useState({ packs: 0, usd: 0 });
  const [best, setBest] = useState(0);
  const [copied, setCopied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0); } catch { /* storage off */ }
    trackEvent("pack_sim_open", { set_id: set.code });
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [set.code]);

  const remember = (usd: number) =>
    setBest((b) => {
      const next = Math.max(b, usd);
      try { localStorage.setItem(BEST_KEY, String(next)); } catch { /* full */ }
      return next;
    });

  const openPack = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const cards = dealPack(set.pools, set.packs);
    setBox(null);
    setPack(cards);
    setRevealed(0);
    trackEvent("pack_sim_pack_opened", { set_id: set.code });
    // Brisk through the commons, a beat before the rare slot.
    let t = 0;
    cards.forEach((_, i) => {
      t += i === cards.length - 1 ? 650 : i < 7 ? 120 : 230;
      timers.current.push(setTimeout(() => setRevealed(i + 1), t));
    });
    const usd = packValueUsdCents(cards);
    timers.current.push(setTimeout(() => { setSession((s) => ({ packs: s.packs + 1, usd: s.usd + usd })); remember(usd); }, t + 50));
  };

  const openBox = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const packs = Array.from({ length: set.packs }, () => dealPack(set.pools, set.packs));
    setPack(null);
    setBox(packs);
    trackEvent("pack_sim_box_opened", { set_id: set.code });
    const values = packs.map(packValueUsdCents);
    setSession((s) => ({ packs: s.packs + packs.length, usd: s.usd + values.reduce((a, v) => a + v, 0) }));
    remember(Math.max(0, ...values));
  };

  const share = async (text: string) => {
    const url = `${window.location.origin}/tools/pack-sim/${set.slug}`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* dismissed */ }
  };

  const packUsd = pack ? packValueUsdCents(pack) : 0;
  const packBest = pack ? bestPull(pack) : null;
  const allRevealed = pack != null && revealed >= pack.length;

  const boxCards = box?.flat() ?? [];
  const boxUsd = packValueUsdCents(boxCards);
  const hits = boxCards.filter((c) => HIT_POOLS.has(c.pool)).sort((a, b) => (b.usdCents ?? 0) - (a.usdCents ?? 0));
  const hitCounts = new Map<PoolKey, number>();
  for (const c of hits) hitCounts.set(c.pool, (hitCounts.get(c.pool) ?? 0) + 1);
  const boxPriceUsd = offer ? toUsdCents(offer.priceCents, currency) : null;

  return (
    <div className="space-y-4">
      <div className="card-surface flex flex-wrap items-end gap-3 p-4">
        <label className="block min-w-[200px] flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-400">Set</span>
          <select value={set.slug} onChange={(e) => router.push(`/tools/pack-sim/${e.target.value}`)} className="input">
            {sets.map((s) => (
              <option key={s.slug} value={s.slug}>{s.code} · {s.name}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={openPack} className="btn-primary min-w-[150px]">
          {pack ? "Open another pack" : "Open a pack"}
        </button>
        <button type="button" onClick={openBox} className="btn-ghost">
          Open a box ({set.packs} packs)
        </button>
      </div>

      {(session.packs > 0 || best > 0) && (
        <p className="text-center text-xs text-slate-500">
          {session.packs > 0 && <>This session: <span className="num text-slate-300">{session.packs}</span> {session.packs === 1 ? "pack" : "packs"}, <span className="num text-slate-300">{money(session.usd)}</span> of cards</>}
          {session.packs > 0 && best > 0 && " · "}
          {best > 0 && <>Your best pack: <span className="num text-gold">{money(best)}</span></>}
        </p>
      )}

      {!pack && !box && (
        <div className="card-surface grid place-items-center p-10 text-center text-sm text-slate-400">
          <p className="max-w-md">
            Pick a set and open a pack. Every card is a real {set.code} card at its real market price. Most packs are
            bulk, just like the real thing.
          </p>
        </div>
      )}

      {pack && (
        <div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {pack.map((c, i) => {
              const shown = i < revealed;
              const color = POOL_COLOR[c.pool];
              return (
                <div key={i} className="[perspective:800px]">
                  <div className={`relative aspect-[300/419] w-full transition-transform duration-500 [transform-style:preserve-3d] ${shown ? "[transform:rotateY(180deg)]" : ""}`}>
                    <div className="absolute inset-0 grid place-items-center rounded-lg border border-ink-700 bg-gradient-to-br from-ink-800 to-ink-900 [backface-visibility:hidden]" aria-hidden>
                      <span className="font-display text-lg font-extrabold text-ink-600">OP</span>
                    </div>
                    <Link
                      href={`/card/${c.slug}`}
                      className="absolute inset-0 overflow-hidden rounded-lg border-2 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                      style={{ borderColor: color }}
                      title={`${c.name} · ${POOL_LABEL[c.pool]}`}
                      tabIndex={shown ? 0 : -1}
                    >
                      <CardArt id={c.id} hasImage={c.hasImage} alt={c.name} className="h-full rounded-none" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent px-1.5 pb-1 pt-5 text-center">
                        <span className="block truncate text-[10px] font-bold text-white">{c.name}</span>
                        <span className="block text-[10px] font-bold" style={{ color }}>
                          {POOL_LABEL[c.pool]} · {c.usdCents != null && c.usdCents > 0 ? money(c.usdCents) : "bulk"}
                        </span>
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {allRevealed && (
            <div className="card-surface animate-fade-up mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">This pack is worth</div>
                <div className="num font-display text-3xl font-extrabold text-white">{money(packUsd)}</div>
                {packBest && (
                  <div className="mt-0.5 text-xs text-slate-400">
                    Best pull: <Link href={`/card/${packBest.slug}`} className="font-semibold text-brand-400 hover:underline">{packBest.name}</Link> ({money(packBest.usdCents ?? 0)})
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={openPack} className="btn-primary text-sm">Open another</button>
                <button
                  type="button"
                  onClick={() => share(`I opened a ${set.code} pack on OP Compare and pulled ${money(packUsd)} of cards${packBest ? `, best card ${packBest.name}` : ""}.`)}
                  className="btn-ghost text-sm"
                >
                  {copied ? "Copied" : "Share pull"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {box && (
        <div className="card-surface animate-fade-up overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-800 bg-ink-900/60 p-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Your {set.packs}-pack box pulled</div>
              <div className="num font-display text-4xl font-extrabold leading-none text-white">{money(boxUsd)}</div>
              <div className="mt-1 text-xs text-slate-500">{boxCards.length} cards · {hits.length} hits</div>
            </div>
            {offer && boxPriceUsd != null && (
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">A real box costs</div>
                <div className="num text-3xl font-extrabold leading-none text-white">{formatMoney(offer.priceCents, currency)}</div>
                <div className={`mt-1 text-xs font-semibold ${boxUsd >= boxPriceUsd ? "text-up" : "text-down"}`}>
                  {boxUsd >= boxPriceUsd ? "This box beat its price" : `${money(boxPriceUsd - boxUsd)} short of its price`}
                </div>
              </div>
            )}
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-400">
              {[...hitCounts].map(([p, n]) => `${n} ${POOL_LABEL[p]}`).join(" · ") || "No hits above Rare in this box."}
            </p>
            {hits.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {hits.slice(0, 12).map((c, i) => (
                  <Link key={i} href={`/card/${c.slug}`} className="group relative block overflow-hidden rounded-lg border-2" style={{ borderColor: POOL_COLOR[c.pool] }} title={c.name}>
                    <CardArt id={c.id} hasImage={c.hasImage} alt={c.name} className="rounded-none" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent px-1.5 pb-1 pt-5 text-center">
                      <span className="block truncate text-[10px] font-bold text-white">{c.name}</span>
                      <span className="block text-[10px] font-bold" style={{ color: POOL_COLOR[c.pool] }}>
                        {POOL_LABEL[c.pool]} · {c.usdCents != null && c.usdCents > 0 ? money(c.usdCents) : "bulk"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={openBox} className="btn-primary text-sm">Open another box</button>
              <button type="button" onClick={() => share(`I opened a virtual ${set.code} booster box on OP Compare and pulled ${money(boxUsd)} of cards.`)} className="btn-ghost text-sm">
                {copied ? "Copied" : "Share box"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The real thing: the cheapest in-stock box we track in the visitor's market. */}
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-300">
          {offer ? (
            <>
              Want to open a real one? The cheapest in-stock {set.code} booster box we track is{" "}
              <span className="num font-bold text-white">{formatMoney(offer.priceCents, currency)}</span> at {offer.retailerName}.
            </>
          ) : (
            <>Want to open a real one? Compare {set.code} booster box prices across every store we track.</>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {offer && (
            <a href={offer.href} target="_blank" rel={outboundRel()} data-retailer={offer.retailer} data-page="pack_sim" className="btn-primary text-sm">
              Buy at {offer.retailerName} →
            </a>
          )}
          <Link href={offer ? `/sealed/${offer.boxSlug}` : "/sealed"} className="btn-ghost text-sm">Compare box prices</Link>
          <Link href={`/sets/${set.slug}`} className="btn-ghost text-sm">Buy the singles</Link>
        </div>
      </div>
    </div>
  );
}
