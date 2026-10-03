"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CardQuickLink from "@/components/CardQuickLink";
import { useCountry } from "@/components/CountryProvider";
import { COUNTRIES, MARKETS, type Country } from "@/lib/country";
import { outboundRel } from "@/lib/affiliate";
import { encodeDeckParam, formatDeckLine, DECK_SIZE, COPY_LIMIT } from "@/lib/deck";
import type { DeckPriceResult, DeckLineOut } from "@/lib/deck-price";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { usdCentsToCountry } from "@/lib/fx";
import { DATA_TABLE } from "@/components/prose";

// The free deck & list pricer (RiftCompare's DeckBuilder, for One Piece). The
// paste box is the list: pricing resolves it on the server (/api/deck/price)
// and rewrites it in canonical form ("4xOP01-016", "#id" for a non-base
// printing), so what you see is what the share link and the Buy List Planner
// get. Switching a line's printing edits that line and re-prices.

export const SAMPLE = `Leader
1xOP01-001
Characters
4xOP01-004
4xOP01-005
4xOP01-013
2xOP01-014
4xOP01-015
4xOP01-016
4xOP01-017
4xOP01-021
4xOP01-022
4xOP01-024
4xOP01-025
Events
4xOP01-026
4xOP01-027`;

export function DeckPricer({ initialList }: { initialList: string }) {
  const { country } = useCountry();
  const [text, setText] = useState(initialList);
  const [result, setResult] = useState<DeckPriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<"copied" | "address-bar" | null>(null);
  const lastPriced = useRef<{ text: string; country: Country } | null>(null);

  const price = useCallback(
    async (list: string, add?: { slug: string; qty: number }) => {
      if (!list.trim() && !add) return;
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/deck/price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: list, add }) });
        const j = await r.json();
        if (!r.ok) setError(j.error ?? "Please try again.");
        else {
          const res = j as DeckPriceResult;
          setResult(res);
          setText(res.text || list);
          lastPriced.current = { text: res.text || list, country };
          try {
            window.history.replaceState(null, "", `/deck?list=${encodeDeckParam(res.text || list)}`);
          } catch {
            /* history blocked */
          }
        }
      } catch {
        setError("Please try again.");
      }
      setLoading(false);
    },
    [country],
  );

  // A shared link prices itself once; a market change re-prices what was priced.
  useEffect(() => {
    if (lastPriced.current) {
      if (lastPriced.current.country !== country) price(lastPriced.current.text);
    } else if (initialList.trim()) price(initialList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  const switchPrinting = (line: DeckLineOut, id: number) => {
    if (!result) return;
    const lines = result.lines.map((l) => (l === line ? formatDeckLine(l.qty, { id, number: l.card.number }, true) : l.text));
    price([...lines, ...result.unmatched].join("\n"));
  };
  const setQty = (line: DeckLineOut, qty: number) => {
    if (!result) return;
    const lines = result.lines
      .map((l) => (l === line ? (qty > 0 ? l.text.replace(/^\d+x/, `${qty}x`) : null) : l.text))
      .filter((x): x is string => x != null);
    price([...lines, ...result.unmatched].join("\n"));
  };

  // "Add a card": the picked printing joins the list; picked for an unmatched
  // line, it replaces that line and keeps its quantity (RiftCompare's
  // search-to-add and "search for this").
  const [find, setFind] = useState<{ n: number; q: string; raw: string | null }>({ n: 0, q: "", raw: null });
  const searchBox = useRef<HTMLDivElement>(null);
  const addCard = (slug: string) => {
    const raw = find.raw;
    const qty = raw ? Math.max(1, Math.min(4, parseInt(/^\s*(\d{1,2})/.exec(raw)?.[1] ?? "1", 10) || 1)) : 1;
    const base = result ? [...result.lines.map((l) => l.text), ...result.unmatched.filter((u) => u !== raw)] : text.split(/\r?\n/).filter((l) => l.trim() && l.trim() !== raw);
    setFind((f) => ({ n: f.n + 1, q: "", raw: null }));
    price(base.join("\n"), { slug, qty });
  };
  const lookFor = (raw: string) => {
    setFind((f) => ({ n: f.n + 1, q: raw.replace(/^\s*\d{1,2}\s*[xX×]?\s*/, "").replace(/#\d+/, "").trim(), raw }));
    searchBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const share = async () => {
    const list = result?.text || text;
    if (!list.trim()) return;
    const url = `${window.location.origin}/deck?list=${encodeDeckParam(list)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared("copied");
    } catch {
      window.history.replaceState(null, "", url);
      setShared("address-bar");
    }
    setTimeout(() => setShared(null), 2500);
  };

  const c = COUNTRIES[country];
  const t = result?.totals[country];
  const fmt = (cents: number | null | undefined) => money(cents, country);
  const listParam = encodeDeckParam(result?.text || text);

  const searchBlock = (
  <div ref={searchBox}>
    <DeckAddSearch key={find.n} initialQuery={find.q} label={find.raw ? `Find the card for “${find.q}”` : "Add a card to your list"} onPick={addCard} disabled={loading} />
    {find.raw ? (
      <button type="button" onClick={() => setFind((f) => ({ n: f.n + 1, q: "", raw: null }))} className="mt-1 text-xs text-slate-400 hover:text-white">
        Cancel
      </button>
    ) : null}
  </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="card-surface p-4">
          <label htmlFor="deck-paste" className="mb-1 block text-sm font-semibold text-white">
            Paste your decklist or card list
          </label>
          <p className="mb-2 text-xs text-slate-400">
            One card per line: <span className="font-mono">4xOP01-016</span>, <span className="font-mono">4 OP01-016</span> or{" "}
            <span className="font-mono">4 Nami (OP01-016)</span>. A name alone works too. Section headers like Leader, Characters and Events are skipped.
          </p>
          <textarea
            id="deck-paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={"Leader\n1xOP01-001\n4xOP01-016\n4 Nami (OP01-016)\n…"}
            className="input font-mono sm:text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => price(text)} disabled={loading || !text.trim()} className="btn-primary flex-1 disabled:opacity-60">
              {loading ? "Pricing…" : "Price this list"}
            </button>
            <button type="button" onClick={() => setText(SAMPLE)} className="btn-ghost">
              Sample
            </button>
          </div>
          <button type="button" onClick={share} disabled={!(result?.text || text).trim()} className="btn-ghost mt-2 w-full text-sm disabled:opacity-50" title="Copy a link that loads and prices this exact list">
            {shared === "copied" ? "Link copied" : shared === "address-bar" ? "The link is in your address bar" : "Copy shareable link"}
          </button>
        </div>
      </div>

      <div className="min-w-0 space-y-4" aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {!result && !loading ? searchBlock : null}
        {!result ? (
          loading ? (
            <div className="card-surface grid place-items-center p-16 text-center text-slate-400">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-brand-400" />
              <p className="mt-3 text-sm font-semibold text-white">Pricing your list…</p>
            </div>
          ) : (
            <div className="card-surface p-8 text-center text-slate-300">
              <p className="text-lg font-semibold text-white">Price a whole One Piece deck at once</p>
              <p className="mt-1 text-sm text-slate-400">
                Paste a decklist from any deck builder and every card is matched to its printing and priced at the cheapest in-stock store in {c.place}, with
                TCGplayer&apos;s market price beside it. Press Sample to try one, or build it here, card by card.
              </p>
            </div>
          )
        ) : (
          <>
            <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex flex-wrap gap-6">
                <Sum label={`Cheapest in ${c.code}`} value={fmt(t?.cents)} highlight />
                <Sum label="TCGplayer market" value={`≈ ${fmt(usdCentsToCountry(result.marketUsdTotal, country))}`} />
                <Sum label="Cards priced" value={`${t?.pricedQty ?? 0}/${t?.totalQty ?? 0}`} />
              </div>
              <Link href={`/tools/buy-list?list=${listParam}`} className="btn-ghost text-sm" title="Plan the order across stores in the Buy List Planner">
                Send to Buy List Planner →
              </Link>
            </div>

            <DeckChecks result={result} />
            <p className="text-xs text-slate-400">
              Matched {result.lineCount - result.unmatched.length} of {result.lineCount} line{result.lineCount === 1 ? "" : "s"}
              {result.unmatched.length ? `; ${result.unmatched.length} couldn't be matched (listed below).` : "."}
              {result.truncated ? " Only the first 120 lines are priced." : ""}
            </p>
            {searchBlock}

            <section className="card-surface overflow-hidden" aria-label="Your list">
              <ul className="divide-y divide-ink-800">
                {result.lines.map((l) => (
                  <li key={`${l.card.id}-${l.raw}`} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                    <label className="sr-only" htmlFor={`qty-${l.card.id}`}>
                      Copies of {l.card.name}
                    </label>
                    <select
                      id={`qty-${l.card.id}`}
                      value={l.qty}
                      onChange={(e) => setQty(l, Number(e.target.value))}
                      className="input w-16 shrink-0 px-2 py-1 sm:text-sm"
                      disabled={loading}
                    >
                      {[0, 1, 2, 3, 4, ...(l.qty > 4 ? [l.qty] : [])].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? "✕" : n}
                        </option>
                      ))}
                    </select>
                    <CardQuickLink slug={l.card.slug} className="shrink-0">
                      {l.card.hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cardImage.thumb(l.card.id)} alt="" width={36} height={50} loading="lazy" className="h-[50px] w-9 rounded object-cover ring-1 ring-ink-700" />
                      ) : (
                        <span className="block h-[50px] w-9 rounded bg-ink-800" />
                      )}
                    </CardQuickLink>
                    <div className="min-w-0 flex-1">
                      <CardQuickLink slug={l.card.slug} className="font-semibold text-white hover:text-brand-400">
                        {l.card.name}
                      </CardQuickLink>
                      {l.leader ? <span className="chip ml-2 border border-gold/40 text-[10px] text-gold">Leader</span> : null}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                        {l.options.length > 1 ? (
                          <>
                            <label className="sr-only" htmlFor={`pr-${l.card.id}`}>
                              Printing of {l.card.name}
                            </label>
                            <select
                              id={`pr-${l.card.id}`}
                              value={l.card.id}
                              onChange={(e) => switchPrinting(l, Number(e.target.value))}
                              disabled={loading}
                              className="w-full min-w-0 max-w-full rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 text-xs text-slate-200 sm:w-auto sm:max-w-[16rem]"
                            >
                              {l.options.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                  {o.low != null ? ` · ${fmt(o.low)}` : ""}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <span>
                            {l.card.number} {l.card.variant ?? ""}
                          </span>
                        )}
                        {l.how === "name" ? (
                          <span className="text-gold" title={`Matched by name from “${l.raw}”`}>
                            {l.ambiguous ? "matched by name: check the printing" : "matched by name"}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {l.cheapest ? (
                          <a href={l.cheapest.url} target="_blank" rel={outboundRel()} data-retailer={l.cheapest.source.replace("store:", "")} data-page="deck" data-card={l.card.slug} data-surface="deck_cheapest" className="font-semibold text-brand-400 hover:underline">
                            {l.cheapest.store}
                            {l.cheapest.condition && l.cheapest.condition !== "NM" ? ` (${l.cheapest.condition})` : ""} →
                          </a>
                        ) : (
                          <span className="text-slate-500">No store in {c.place} has it in stock</span>
                        )}
                        {l.tcgplayerUrl && country === "US" && l.cheapest?.source !== "tcgplayer" ? (
                          <a href={l.tcgplayerUrl} target="_blank" rel={outboundRel()} data-retailer="tcgplayer" data-page="deck" data-card={l.card.slug} data-surface="deck_tcgplayer" className="text-slate-300 hover:underline">
                            TCGplayer
                          </a>
                        ) : null}
                        <a href={l.ebayUrl} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page="deck" data-card={l.card.slug} data-surface="deck_ebay" className="text-slate-300 hover:underline">
                          eBay
                        </a>
                      </div>
                    </div>
                    <div className="ml-auto shrink-0 text-right">
                      {l.card.low[country] != null ? (
                        <>
                          <div className="num font-bold text-white">{fmt((l.card.low[country] ?? 0) * l.qty)}</div>
                          <div className="num text-[11px] text-slate-400">{fmt(l.card.low[country])} ea</div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500">no listing</div>
                      )}
                      {l.card.marketUsd != null ? <div className="num text-[11px] text-slate-500">TCG ≈ {fmt(usdCentsToCountry(l.card.marketUsd, country))}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-ink-700 p-4">
                <span className="text-sm text-slate-400">
                  {t?.pricedQty ?? 0} of {t?.totalQty ?? 0} cards priced in {c.place}
                </span>
                <span className="num text-xl font-extrabold text-accent">{fmt(t?.cents)}</span>
              </div>
            </section>

            {result.unmatched.length ? (
              <section className="card-surface p-4">
                <p className="text-sm font-semibold text-gold">
                  {result.unmatched.length} line{result.unmatched.length === 1 ? "" : "s"} couldn&apos;t be matched, so {result.unmatched.length === 1 ? "it is" : "they are"} not in the total
                </p>
                <ul className="mt-2 space-y-1">
                  {result.unmatched.map((u) => (
                    <li key={u} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-mono text-xs text-slate-300">{u}</span>
                      <button type="button" onClick={() => lookFor(u)} className="shrink-0 text-xs font-semibold text-brand-400 hover:underline">
                        Find it
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="card-surface p-5" aria-labelledby="by-store-h">
              <h2 id="by-store-h" className="text-lg text-white">
                Buy each card where it&apos;s cheapest
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {result.split.groups.length ? (
                  <>
                    <span className="num font-semibold text-white">{fmt(result.split.totalCents)}</span> across {result.split.groups.length} store
                    {result.split.groups.length === 1 ? "" : "s"} in {c.place}, item prices only. Postage is extra at each store, so fewer stores can work out cheaper.
                  </>
                ) : (
                  <>No store in {c.place} has any of these in stock today.</>
                )}
              </p>
              {result.split.groups.map((g) => (
                <details key={g.source} className="mt-3 rounded-lg border border-ink-800 p-3">
                  <summary className="flex cursor-pointer justify-between gap-3 text-sm">
                    <span className="font-semibold text-white">{g.store}</span>
                    <span className="text-slate-300">
                      {g.copies} card{g.copies === 1 ? "" : "s"} · <span className="num font-semibold text-white">{fmt(g.totalCents)}</span>
                    </span>
                  </summary>
                  <ul className="mt-2 divide-y divide-ink-800">
                    {g.picks.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                        <span className="min-w-0 truncate text-slate-200">
                          {p.qty}× {p.name}
                          {p.condition && p.condition !== "NM" ? <span className="text-slate-500"> · {p.condition}</span> : null}
                        </span>
                        <a href={p.url} target="_blank" rel={outboundRel()} data-retailer={g.source.replace("store:", "")} data-page="deck" className="num shrink-0 font-semibold text-white hover:text-brand-400">
                          {fmt(p.unitCents * p.qty)} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
              {result.split.missing.length ? <p className="mt-3 text-xs text-slate-500">Not in stock anywhere in {c.place}: {result.split.missing.join(", ")}.</p> : null}
              <p className="mt-3 text-xs text-slate-500">
                Stores publish whether a card is in stock, not how many copies, so check each store has the quantity. The{" "}
                <Link href={`/tools/buy-list?list=${listParam}`} className="text-brand-400 hover:underline">
                  Buy List Planner
                </Link>{" "}
                (Premium) adds the best single-store orders and a minimum condition.
              </p>
            </section>

            <section className="card-surface overflow-x-auto p-5" aria-labelledby="markets-h">
              <h2 id="markets-h" className="text-lg text-white">
                This list in every market
              </h2>
              <table className={`${DATA_TABLE} mt-3 min-w-[420px]`}>
                <thead>
                  <tr>
                    <th>Market</th>
                    <th className="text-right">Cheapest total</th>
                    <th className="text-right">Cards priced</th>
                  </tr>
                </thead>
                <tbody>
                  {MARKETS.map((m) => (
                    <tr key={m} className={m === country ? "bg-brand-500/10" : undefined}>
                      <td className="text-slate-200">{COUNTRIES[m].label}</td>
                      <td className="num text-right font-semibold text-white">{money(result.totals[m].cents, m)}</td>
                      <td className="num text-right text-slate-300">
                        {result.totals[m].pricedQty}/{result.totals[m].totalQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">Each market&apos;s total covers only the cards in stock there, in its own currency.</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

interface SearchHit {
  kind: "card" | "sealed";
  slug: string;
  name: string;
  number: string | null;
  variant: string | null;
  set: string;
  img: string | null;
  price: string;
}

// The deck page's own card picker over /api/search (the header search
// navigates; this one adds the picked printing to the list). Cards only.
function DeckAddSearch({ initialQuery, label, onPick, disabled }: { initialQuery: string; label: string; onPick: (slug: string) => void; disabled: boolean }) {
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(Boolean(initialQuery));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (initialQuery) input.current?.focus();
  }, [initialQuery]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(s)}`, { signal: ctrl.signal });
        if (r.ok) {
          const j = (await r.json()) as { hits?: SearchHit[] };
          setHits((j.hits ?? []).filter((h) => h.kind === "card"));
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  const pick = (h: SearchHit) => {
    setOpen(false);
    onPick(h.slug);
  };
  const listId = "deck-add-results";
  return (
    <div className="card-surface relative p-4">
      <label htmlFor="deck-add" className="mb-1 block text-xs font-semibold text-slate-300">
        {label}
      </label>
      <input
        id="deck-add"
        ref={input}
        value={q}
        disabled={disabled}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Enter" && hits.length) {
            e.preventDefault();
            pick(hits[Math.max(0, active)]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Card name or number, e.g. Nami or OP01-016"
        autoComplete="off"
        className="input sm:text-sm"
      />
      {open && hits.length ? (
        <ul id={listId} role="listbox" className="absolute left-4 right-4 z-dropdown mt-1 max-h-80 overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 shadow-glow">
          {hits.map((h, i) => (
            <li
              key={h.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(h);
              }}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-ink-800" : "hover:bg-ink-800"}`}
            >
              {h.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.img} alt="" className="h-11 w-8 shrink-0 rounded-sm bg-ink-800 object-cover" loading="lazy" />
              ) : (
                <span className="h-11 w-8 shrink-0 rounded-sm bg-ink-800" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-100">
                  {h.name}
                  {h.variant ? <span className="font-normal text-slate-400"> · {h.variant}</span> : null}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {h.set}
                  {h.number ? ` · ${h.number}` : ""}
                </span>
              </span>
              <span className="num shrink-0 text-sm font-semibold text-accent">{h.price}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DeckChecks({ result }: { result: DeckPriceResult }) {
  const { leaders, mainCards, overLimit } = result.check;
  const notes: string[] = [];
  if (leaders !== 1) notes.push(leaders === 0 ? "No Leader in the list." : `${leaders} Leaders in the list; a deck has one.`);
  if (mainCards !== DECK_SIZE) notes.push(`${mainCards} cards besides the Leader; a deck has ${DECK_SIZE}.`);
  if (overLimit.length) notes.push(`More than ${COPY_LIMIT} copies of ${overLimit.join(", ")}.`);
  if (!notes.length) return <p className="text-xs text-emerald-400">Deck shape checks out: one Leader and {DECK_SIZE} cards, at most {COPY_LIMIT} of each.</p>;
  return <p className="text-xs text-slate-400">Pricing a list, not a deck? Fine. As a deck: {notes.join(" ")}</p>;
}

function Sum({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num text-xl font-extrabold ${highlight ? "text-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}
