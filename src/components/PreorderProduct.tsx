import Link from "next/link";
import type { ReactNode } from "react";
import { COUNTRIES, type Country } from "@/lib/country";
import type { SealedLite } from "@/lib/data";
import type { ProductBoard, SoldOutRow } from "@/lib/preorders";
import type { BuyRow } from "@/lib/quick-view";
import { ebayLabel, ebaySearchUrl, onePieceEbayQuery, outboundRel, affiliateUrl } from "@/lib/affiliate";
import { money, shortDate, usd } from "@/lib/format";

const VISIBLE = 5;

/**
 * One pre-order product (owner, 2026-10-16: "the eBay links stay at the very
 * top, alongside the TCGplayer ones, and everything else is priced in order"):
 *
 *   1. MARKETPLACES, pinned at the top in their own labelled block: eBay first
 *      (the cheapest real eBay listing productBoard holds, with its postage, else
 *      a search), then TCGplayer (its cheapest listing, else a link with the
 *      market price as a reference). Not numbered, not counted as stores, never
 *      the "Cheapest" badge: they are outside the ranking, and say so.
 *   2. STORES, cheapest first: every open store pre-order by item price, numbered,
 *      "Cheapest store" on #1, the rest behind "N more"; then the stores that are
 *      sold out or not seen lately, last, folded, never priced as buyable.
 *
 * The header's "From" is the cheapest open offer from anyone (board.rows[0]),
 * so the pin never moves the number the product is shown at. Server component;
 * every outbound link is the affiliate-tagged one lib/quick-view or
 * lib/preorders built, or an affiliate-tagged eBay search / TCGplayer link.
 */
export function PreorderProduct({
  s,
  board,
  country,
  page,
  headingLevel = 3,
}: {
  s: SealedLite;
  board: ProductBoard;
  country: Country;
  page: string;
  headingLevel?: 2 | 3;
}) {
  const c = COUNTRIES[country];
  const H = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  const Sub = (headingLevel === 2 ? "h3" : "h4") as "h3" | "h4";
  const ebaySearch = ebaySearchUrl(country, onePieceEbayQuery(`${s.name.replace(/\s+-\s+/g, " ")} English`).replace(/\bbooster box\b/i, "booster (box,display)"), "preorders-product");
  const tcgHref = affiliateUrl(s.tcgplayerUrl, "tcgplayer", `/${page}`);
  const { ebay, tcgplayer } = board.cheapest;
  const shown = board.stores.slice(0, VISIBLE);
  const more = board.stores.slice(VISIBLE);
  const lowest = board.rows[0] ?? null;
  const kindWord = s.kind.toLowerCase();

  // One marketplace line: name and chip, a note, a price (or none), one button.
  const market = (o: {
    key: string;
    name: string;
    note: ReactNode;
    price: ReactNode;
    href: string;
    retailer: string;
    surface: string;
    btn: "btn-ebay" | "btn-tcg";
    wide: string;
    narrow: string;
    aria: string;
  }) => (
    <li key={o.key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-white">{o.name}</p>
        <div className="mt-0.5 text-xs text-slate-400">{o.note}</div>
      </div>
      {o.price}
      <a
        href={o.href}
        target="_blank"
        rel={outboundRel()}
        data-retailer={o.retailer}
        data-page={page}
        data-card={s.slug}
        data-surface={o.surface}
        className={`${o.btn} shrink-0 px-3 sm:w-44 sm:px-4`}
        aria-label={o.aria}
      >
        <span className="hidden sm:inline">{o.wide}</span>
        <span className="sm:hidden">{o.narrow}</span>
      </a>
    </li>
  );

  const price = (cents: number) => <span className="num shrink-0 text-right text-base font-bold text-accent sm:text-lg">{money(cents, country)}</span>;

  const ebayLine = ebay
    ? market({
        key: "ebay",
        name: ebay.label,
        note: (
          <>
            <p>cheapest matching listing · {ebay.postage}</p>
            <a href={ebaySearch} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} data-card={s.slug} data-surface="preorder_marketplace_ebay_more" className="tap-link font-semibold text-sky-300 hover:underline">
              More listings on {ebayLabel(country)} →
            </a>
          </>
        ),
        price: price(ebay.priceCents),
        href: ebay.href,
        retailer: ebay.retailer,
        surface: "preorder_marketplace_ebay",
        btn: "btn-ebay",
        wide: "Buy on eBay →",
        narrow: "→",
        aria: `Buy on ${ebay.label}`,
      })
    : market({
        key: "ebay",
        name: ebayLabel(country),
        note: <p>No eBay listing on file for this {kindWord} yet. Sellers set their own dispatch dates, so check each listing.</p>,
        price: null,
        href: ebaySearch,
        retailer: "ebay_search",
        surface: "preorder_marketplace_ebay",
        btn: "btn-ebay",
        wide: "Search eBay →",
        narrow: "Search",
        aria: `Search ${ebayLabel(country)} for ${s.name}`,
      });

  const tcgLine = tcgplayer
    ? market({
        key: "tcgplayer",
        name: tcgplayer.label,
        note: <p>lowest listing · {tcgplayer.postage}</p>,
        price: price(tcgplayer.priceCents),
        href: tcgplayer.href,
        retailer: tcgplayer.retailer,
        surface: "preorder_marketplace_tcgplayer",
        btn: "btn-tcg",
        wide: "Buy on TCGplayer →",
        narrow: "→",
        aria: "Buy on TCGplayer",
      })
    : market({
        key: "tcgplayer",
        name: "TCGplayer",
        note: <p>{s.marketUsd ? "market price (US) · a reference, not a listing" : "no TCGplayer price on file yet"}</p>,
        // A reference, never a price to buy at: no accent colour.
        price: s.marketUsd ? <span className="num shrink-0 text-right text-sm font-semibold text-slate-300">{usd(s.marketUsd)}</span> : null,
        href: tcgHref,
        retailer: "tcgplayer",
        surface: "preorder_marketplace_tcgplayer",
        btn: "btn-tcg",
        wide: "See TCGplayer →",
        narrow: "→",
        aria: `See ${s.name} on TCGplayer`,
      });

  const row = (r: BuyRow, i: number) => (
    <li key={`${r.source}-${i}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="num w-5 shrink-0 text-center text-sm text-slate-500">{i + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words text-[15px] font-semibold text-white">{r.label}</span>
          {i === 0 ? <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Cheapest store</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">pre-order · {r.postage}</p>
      </div>
      <span className="num shrink-0 text-right text-base font-bold text-accent sm:text-lg">{money(r.priceCents, country)}</span>
      <a
        href={r.href}
        target="_blank"
        rel={outboundRel()}
        data-retailer={r.retailer}
        data-page={page}
        data-card={s.slug}
        data-surface="preorder_row"
        className="btn-primary shrink-0 px-3 sm:w-44 sm:px-4"
        aria-label={`Pre-order at ${r.label}`}
      >
        <span className="hidden sm:inline">Pre-order →</span>
        <span className="sm:hidden">→</span>
      </a>
    </li>
  );

  // Sold out or not seen lately: no number, no price to buy at, no buy button.
  const dead = (o: SoldOutRow) => (
    <li key={`${o.source}-out`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words text-slate-300">{o.label}</span>
          {o.state === "soldout" ? (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">Sold out</span>
          ) : (
            <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Not seen lately</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {o.state === "soldout" ? "last listed at" : `last seen ${shortDate(o.updatedAt)} at`} <span className="num">{money(o.priceCents, country)}</span>
        </p>
      </div>
      <a href={o.href} target="_blank" rel={outboundRel()} data-retailer={o.retailer} data-page={page} data-card={s.slug} data-surface="preorder_sold_out" className="tap-link shrink-0 text-xs font-semibold text-brand-400 hover:underline">
        Check →
      </a>
    </li>
  );
  const soldOutCount = board.soldOut.filter((o) => o.state === "soldout").length;
  const unseenCount = board.soldOut.length - soldOutCount;
  const deadSummary = [soldOutCount ? `${soldOutCount} sold out` : "", unseenCount ? `${unseenCount} not seen lately` : ""].filter(Boolean).join(" · ");

  return (
    <section className="card-surface overflow-hidden" aria-label={s.name}>
      <div className="flex items-center gap-4 border-b border-ink-800 px-4 py-4 sm:px-5">
        {s.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imageUrl} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-lg bg-white/90 object-contain p-1" />
        ) : null}
        <div className="min-w-0 flex-1">
          <H className="text-lg font-extrabold leading-tight text-white">
            <Link href={`/sealed/${s.slug}`} className="hover:text-brand-300">
              {s.name}
            </Link>
          </H>
          <p className="mt-1 text-xs text-slate-400">
            {s.kind}
            {s.packCount ? ` · ${s.packCount} ${s.packCount === 1 ? "pack" : "packs"}` : ""}
            {s.marketUsd ? ` · TCGplayer market ${usd(s.marketUsd)}` : ""}
          </p>
        </div>
        {lowest ? (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">From · {c.code}</p>
            <p className="num text-xl font-extrabold text-accent">{money(lowest.priceCents, country)}</p>
          </div>
        ) : null}
      </div>

      {/* Marketplaces: pinned, labelled, outside the ranking (owner, 2026-10-16). */}
      <div className="border-b border-ink-800 bg-ink-850/60">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 pt-3 sm:px-5">
          <Sub className="text-xs font-bold uppercase tracking-wider text-slate-300">Marketplaces</Sub>
          <span className="text-[11px] text-slate-500">individual sellers · not ranked with the stores · affiliate links</span>
        </div>
        <ul className="divide-y divide-ink-800/70">
          {ebayLine}
          {tcgLine}
        </ul>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 pt-3 sm:px-5">
          <Sub className="text-xs font-bold uppercase tracking-wider text-slate-300">Stores, cheapest first</Sub>
          {board.stores.length ? (
            <span className="text-[11px] text-slate-500">
              {board.stores.length} taking pre-orders in {c.place}
            </span>
          ) : null}
        </div>
        {board.stores.length ? (
          <>
            <ol className="divide-y divide-ink-800">{shown.map(row)}</ol>
            {more.length ? (
              <details className="border-t border-ink-800">
                <summary className="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
                  {more.length} more {more.length === 1 ? "store" : "stores"}
                </summary>
                <ol className="divide-y divide-ink-800 border-t border-ink-800">{more.map((r, i) => row(r, i + VISIBLE))}</ol>
              </details>
            ) : null}
          </>
        ) : (
          <p className="px-4 pb-4 pt-2 text-sm text-slate-300 sm:px-5">No {c.adjective} store we track has a pre-order open for this yet.</p>
        )}
        {board.soldOut.length ? (
          <details className="border-t border-ink-800" open={!board.stores.length}>
            <summary className="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
              {deadSummary}: listed here, not taking orders
            </summary>
            <ul className="divide-y divide-ink-800 border-t border-ink-800">{board.soldOut.map(dead)}</ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
