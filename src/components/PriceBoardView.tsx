import Link from "next/link";
import { COUNTRIES, type Country } from "@/lib/country";
import type { BoardModel } from "@/lib/board-model";
import { ebayLabel, outboundRel } from "@/lib/affiliate";
import { money } from "@/lib/format";
import { usdCentsToCountry } from "@/lib/fx";
import { StoreCodeChip } from "./StoreCodeChip";
import { Ago } from "./Ago";
import { ReportPriceButton } from "./ReportPriceButton";

// The price comparison (RiftCompare's card-page board): every open offer in one
// market, cheapest first by ITEM price; sold-out stores folded below; eBay
// listings (the eBay pass, lib/ebay-import.ts) beside the stores, ranked by item
// price like every row and never moved because they are eBay. eBay search: a
// "more listings" strip inside the board when an eBay row is there, else
// RiftCompare's fallback block directly under the board ("Search eBay for
// <card>"), so a thin market is never a dead end. TCGplayer's market price is
// the page's TcgMarketPrice block under it — a reference, never a row.
//
// It only DRAWS: every row, label, postage line and tagged href comes resolved
// in a BoardModel (lib/board-model.ts). So it is client-safe: the sealed page
// renders it on the server (PriceBoard) and the ISR card page inside a client
// island that picks the visitor's market (components/card/CardMarket.tsx).
// `now` is when the model was built: the "updated 3h ago" lines count from it
// until the browser's clock takes over (Ago).
export function PriceBoardView({
  model,
  productId,
  country,
  page,
  now,
  title = "Price comparison",
  noun = "card",
  id,
  slug,
  name,
  preRelease = false,
  tcgRef,
}: {
  model: BoardModel;
  productId: number;
  country: Country;
  page: string;
  now: number;
  title?: string;
  noun?: string;
  /** Anchor id (the card page's sticky buy bar hides while this is on screen). */
  id?: string;
  /** data-card on every outbound link: the product's slug. */
  slug?: string;
  /** Display name for the eBay fallback block ("Search eBay for <name>"). */
  name?: string;
  /** The set has not released: the eBay copy says nothing ships yet. */
  preRelease?: boolean;
  /** TCGplayer's market price (USD cents) and tagged link: the pinned TCGplayer
   *  reference row when this market has no TCGplayer listing. */
  tcgRef?: { marketUsd: number | null; href: string };
}) {
  const c = COUNTRIES[country];
  const { rows: open, sold, elsewhere, ebaySearch: ebay } = model;
  const hasEbayRow = open.some((o) => o.ebay);
  // eBay then TCGplayer first (owner, 2026-10-27), each its cheapest row here;
  // the rest by price. `rank` stays the PRICE rank (open is cheapest first).
  const pinEbay = open.find((o) => o.ebay) ?? null;
  const pinTcg = open.find((o) => o.source === "tcgplayer") ?? null;
  const ordered = [...(pinEbay ? [pinEbay] : []), ...(pinTcg ? [pinTcg] : []), ...open.filter((o) => o !== pinEbay && o !== pinTcg)];
  // Outside the US only: there the page's TcgMarketPrice block steps aside (CardMarket MarketReference).
  const showTcgRef = country !== "US" && !pinTcg && tcgRef?.marketUsd != null;
  const oldest = open.length ? open.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b)).updatedAt : null;

  return (
    <>
    <section id={id} className="card-surface scroll-mt-20 overflow-hidden" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-800 px-4 py-3 sm:px-5">
        <h2 className="text-lg text-white">
          {title} <span className="font-sans text-sm font-normal text-slate-400">({open.length}) · {c.place}</span>
        </h2>
        {oldest ? (
          <span className="text-xs text-slate-500">
            oldest listing <Ago at={oldest} now={now} />
          </span>
        ) : null}
      </div>
      {!hasEbayRow || showTcgRef ? (
        <ol className="divide-y divide-ink-800 border-b border-ink-800">
          {hasEbayRow ? null : (
            <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-white">{ebayLabel(country)}</span>
                  <ShownFirst />
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {preRelease
                    ? "Not released yet: eBay sellers set their own dispatch dates, so check each listing."
                    : `No ${ebayLabel(country)} price on file for this ${noun}. Search its current listings.`}{" "}
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span>
                </p>
              </div>
              <a href={ebay} target="_blank" rel={outboundRel()} data-retailer="ebay_no_listing" data-page={page} data-card={slug} data-surface="ebay_fallback" className="btn-ebay shrink-0 whitespace-nowrap px-3 sm:w-48">
                Search eBay →
              </a>
            </li>
          )}
          {showTcgRef && tcgRef?.marketUsd != null ? (
            <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-white">TCGplayer</span>
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">market price</span>
                  <ShownFirst />
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  TCGplayer&apos;s US market price, converted at an approximate rate. TCGplayer may not ship to your country.{" "}
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span>
                </p>
              </div>
              <span className="num shrink-0 text-right text-base font-bold text-white sm:text-lg">
                ≈ {money(usdCentsToCountry(tcgRef.marketUsd, country), country)}
              </span>
              <a href={tcgRef.href} target="_blank" rel={outboundRel()} data-retailer="tcgplayer" data-page={page} data-card={slug} data-surface="board_pinned" className="btn-primary shrink-0 whitespace-nowrap px-3 sm:w-48">
                <span className="hidden sm:inline">Check on TCGplayer →</span>
                <span className="sm:hidden">→</span>
              </a>
            </li>
          ) : null}
        </ol>
      ) : null}
      {open.length ? (
        <ol className="divide-y divide-ink-800">
          {ordered.map((o) => {
            const i = open.indexOf(o);
            const pinned = o === pinEbay || o === pinTcg;
            const tcg = o.source === "tcgplayer";
            const isEbay = Boolean(o.ebay);
            const surface = pinned ? "board_pinned" : "board_row";
            return (
              <li key={`${o.source}-${country}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="num w-5 shrink-0 text-center text-sm text-slate-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-white">{o.label}</span>
                    {i === 0 && open.length > 1 ? <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Cheapest</span> : null}
                    {pinned ? <ShownFirst /> : null}
                  </p>
                  {isEbay ? <p className="mt-0.5 text-xs text-slate-400">Cheapest matching listing we found</p> : null}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                    {o.condition ? <span className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-semibold text-slate-200">{o.condition}</span> : null}
                    {tcg ? <span>lowest listing</span> : null}
                    {isEbay ? null : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        In stock
                      </span>
                    )}
                    <span>{o.postage}</span>
                    {o.policyUrl ? (
                      <a href={o.policyUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-slate-400 underline hover:text-slate-200">
                        shipping policy ↗
                      </a>
                    ) : null}
                    {o.played ? <span className="text-slate-300">{o.played}</span> : null}
                    <span>
                      updated <Ago at={o.updatedAt} now={now} />
                    </span>
                    {o.paid ? <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span> : null}
                    {o.ebay ? null : <StoreCodeChip href={o.href} />}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className={`num block text-base font-bold sm:text-lg ${i === 0 ? "text-accent" : "text-white"}`}>{money(o.priceCents, country)}</span>
                  {pinned && i > 0 && open[0].priceCents > 0 ? (
                    <span className="num block text-[11px] text-slate-500">+{Math.round(((o.priceCents - open[0].priceCents) / open[0].priceCents) * 100)}% vs cheapest</span>
                  ) : null}
                </span>
                <a href={o.href} target="_blank" rel={outboundRel()} data-retailer={o.retailer} data-page={page} data-card={slug} data-surface={surface} className={`${isEbay ? "btn-ebay" : "btn-primary"} hidden shrink-0 whitespace-nowrap sm:inline-flex sm:w-48`}>
                  {tcg ? "Buy on TCGplayer →" : isEbay ? "Buy on eBay →" : "View deal →"}
                </a>
                <a href={o.href} target="_blank" rel={outboundRel()} data-retailer={o.retailer} data-page={page} data-card={slug} data-surface={surface} className={`${isEbay ? "btn-ebay" : "btn-primary"} shrink-0 px-3 sm:hidden`} aria-label={isEbay ? `Buy on ${o.label}` : `Buy at ${o.label}`}>
                  →
                </a>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="px-5 py-6 text-[15px] text-slate-300">
          <p>No {c.adjective} store we track has this in stock right now.</p>
          {elsewhere.length ? (
            <p className="mt-2 text-sm text-slate-400">
              Cheapest elsewhere:{" "}
              {elsewhere.map((e, i) => (
                <span key={e.m}>
                  {i ? " · " : ""}
                  {COUNTRIES[e.m].flag} <span className="num text-slate-200">{money(e.cents, e.m)}</span>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      )}
      {open.length ? (
        <div className="border-t border-ink-800">
          <ReportPriceButton key={country} productId={productId} market={country} offers={open.map((o) => ({ source: o.source, label: o.label }))} />
        </div>
      ) : null}

      {hasEbayRow ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-ink-800 bg-ink-850/50 px-4 py-3 sm:px-5">
          <span className="flex-1 text-sm text-slate-300">
            <span className="font-semibold text-white">{ebayLabel(country)}</span> — more live listings for this {noun}
          </span>
          <a href={ebay} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} data-card={slug} data-surface="ebay_more" className="btn-ebay-ghost min-h-10">
            {`More listings on ${ebayLabel(country)} →`}
          </a>
        </div>
      ) : null}

      {sold.length ? (
        <details className="border-t border-ink-800">
          <summary className="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
            {sold.length} out-of-stock {sold.length === 1 ? "store" : "stores"}
          </summary>
          <p className="px-5 pb-2 text-[11px] text-slate-500">Stores we have seen stock this card. A sold-out store is checked again at every import.</p>
          <ul className="divide-y divide-ink-800 border-t border-ink-800">
            {sold.map((o) => (
              <li key={`${o.source}-sold`} className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-400">
                <span className="flex-1 truncate">{o.label}</span>
                <span className="text-xs">
                  last seen <Ago at={o.updatedAt} now={now} /> · {money(o.priceCents, country)}
                </span>
                <a href={o.href} target="_blank" rel={outboundRel()} data-retailer={o.retailer} data-page={page} data-card={slug} data-surface="board_sold_out" className="text-xs font-semibold text-brand-400 hover:underline">
                  Check →
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="space-y-1 border-t border-ink-800 px-5 py-4 text-center text-xs text-slate-500">
        <p>
          {hasEbayRow
            ? <>Prices are collected from public store listings and eBay&apos;s Buy It Now listings, and may change. eBay prices are sellers&apos; asking prices. </>
            : <>Prices are collected from public store listings and may change. </>}
          <Link href="/methodology" className="underline hover:text-slate-300">How we compare prices</Link>
        </p>
        <p>Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, OP Compare earns from qualifying purchases — at no extra cost to you.</p>
      </div>
    </section>

    </>
  );
}

/** The tag on a row pinned to the top of the board (eBay, TCGplayer). */
function ShownFirst() {
  return (
    <span
      data-shown-first
      title="eBay and TCGplayer are shown first, whatever their price. Every store below is sorted by price."
      className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300"
    >
      Shown first
    </span>
  );
}
