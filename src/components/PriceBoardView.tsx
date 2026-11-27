import { Fragment } from "react";
import Link from "next/link";
import { COUNTRIES, type Country } from "@/lib/country";
import type { BoardModel } from "@/lib/board-model";
import { affiliateUrl, ebayLabel, outboundRel } from "@/lib/affiliate";
import { PIN_OUTLINE, pinnedOrder } from "@/lib/pinned-order";
import { bestTreatment } from "@/lib/best-price";
import { BestPriceTag, BestPriceNote } from "./BestPriceTag";
import { money } from "@/lib/format";
import { usdCentsToCountry } from "@/lib/fx";
import { StoreCodeChip } from "./StoreCodeChip";
import { Ago } from "./Ago";
import { StoreVote } from "./StoreVote";
import { CartAddButton } from "./cart/CartAddButton";
import { ReportPriceButton } from "./ReportPriceButton";
import { TcgSaleChip } from "@/components/TcgSaleChip";

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
  thirdRow,
  image = null,
}: {
  /** The product's picture, for the cart list's line (components/cart). */
  image?: string | null;
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
  tcgRef?: { marketUsd: number | null; href: string; url?: string };
  /** One more pinned row, an <li> drawn right after eBay and TCGplayer (first when neither is shown), or at the
   *  foot of the search rows when no store has stock: the sealed page's marketplace search (owner, 2026-11-03).
   *  A slot, so the board itself never names a marketplace it does not price. */
  thirdRow?: React.ReactNode;
}) {
  const c = COUNTRIES[country];
  const { rows: open, sold, elsewhere, ebaySearch: ebay } = model;
  const hasEbayRow = open.some((o) => o.ebay);
  const fetchItems = fetchRowLis(model.fetch, { country, page, slug, now, title: name, image });
  // eBay and TCGplayer first (owner, 2026-10-27), each its cheapest row here,
  // the cheaper of the two on top and TCGplayer on a tie (2026-10-27, DECISIONS:
  // "The cheaper marketplace leads the pinned pair"); the rest by price. `rank`
  // stays the PRICE rank (open is cheapest first).
  const pinEbay = open.find((o) => o.ebay) ?? null;
  const pinTcg = open.find((o) => o.source === "tcgplayer") ?? null;
  const pins = pinnedOrder(pinEbay, pinTcg);
  // Stores first, marketplaces below (owner, 2026-11-23 UX review, P1 10: "Lead with the best-price store and move marketplaces
  // to a labelled block below"). This reverses the eBay-then-TCGplayer pin at the top (2026-11-17) on the board; the pins keep
  // their own order (pinnedOrder) under a "Marketplaces · Ad" line, and the truly cheapest row keeps its Cheapest mark.
  const stores = open.filter((o) => o !== pinEbay && o !== pinTcg);
  const ordered = [...stores, ...pins];
  // Outside the US only: there the page's TcgMarketPrice block steps aside (CardMarket MarketReference).
  // Fetch TCG is an ordinary store row (owner, 2026-11-12): it sits among the stores by price, after the last open store
  // row that costs no more (else after the pinned rows), with no pin, Ad or Marketplace tag.
  const fetchAnchor = (cents: number) => {
    let at: (typeof ordered)[number] | null = null;
    for (const o of ordered) if (o !== pinEbay && o !== pinTcg && o.priceCents <= cents) at = o;
    return at;
  };
  const fetchAfter = (o: (typeof ordered)[number] | null) => fetchItems.filter((f) => fetchAnchor(f.price) === o).map((f) => f.li);
  const showTcgRef = country !== "US" && !pinTcg && tcgRef?.marketUsd != null;
  // TCGplayer's row is always there too (2026-11-19, "a row that is always there beats a perfect row that is often missing"): with
  // no TCGplayer listing and no reference price here, its tagged link stands in, the product when we know it, else a search.
  const showTcgSearch = !pinTcg && !showTcgRef;
  const tcgSearchHref = tcgRef?.href || affiliateUrl(`https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&q=${encodeURIComponent(name ?? slug ?? "")}`, "tcgplayer", page === "sealed" ? "/sealed" : "/card");
  // The eBay row always exists on this board (a listing, else the pinned search row), and so does TCGplayer's.
  const hasMarketRows = { ebay: true, tcgplayer: true };
  const oldest = open.length ? open.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b)).updatedAt : null;
  const newest = open.length ? open.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).updatedAt : null;
  const marketHead = (
    <li className="bg-ink-850/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5" data-market-head="">
      Marketplaces <span className="ml-1 rounded border border-ink-600 px-1 text-[10px]">Ad</span>
    </li>
  );

  return (
    <>
    <section id={id} className="card-surface scroll-mt-20 overflow-hidden" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-800 px-4 py-3 sm:px-5">
        <h2 className="text-lg text-white">
          {title} <span className="font-sans text-sm font-normal text-slate-400">({open.length}) · {c.place}</span>
        </h2>
        {oldest && newest ? (
          // "Prices checked" (growth report item 7, 2026-11-17): when the newest listing here was read, then the oldest, so an old row is never hidden.
          <span className="text-xs text-slate-500" data-prices-checked="">
            prices checked <Ago at={newest} now={now} /> · oldest listing <Ago at={oldest} now={now} />
          </span>
        ) : null}
      </div>
      {open.length ? (
        <ol className="divide-y divide-ink-800">
          {fetchAfter(null)}
          {ordered.map((o, at) => {
            const i = open.indexOf(o);
            const pinned = o === pinEbay || o === pinTcg;
            const tcg = o.source === "tcgplayer";
            const isEbay = Boolean(o.ebay);
            const surface = pinned ? "board_pinned" : "board_row";
            // Cheapest mark (owner, 2026-11-18): loud only on a paid row; a plain store gets a small neutral tag and a note.
            const best = bestTreatment(i === 0 && open.length > 1, o);
            const plainBest = best === "plain";
            return [
              o === pins[0] ? <Fragment key="market-head">{marketHead}</Fragment> : null,
              <li key={`${o.source}-${country}`} data-price-row="" data-cents={o.priceCents > 0 ? o.priceCents : undefined} data-paid={o.paid || o.ebay || tcg ? 1 : 0} className={`pb-row flex items-center gap-3 px-4 py-3 sm:px-5 ${best === "loud" ? PIN_OUTLINE.cheapest : o === pinEbay ? PIN_OUTLINE.ebay : ""}`}>
                <span className="pb-n num w-5 shrink-0 text-center text-sm text-slate-500">{pinned ? "" : at + 1}</span>
                <div className="pb-info min-w-0 flex-1">
                  <p className="pb-name flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-white">{o.label}</span>
                    {o.host && <StoreVote url={o.host} name={o.label} className="text-slate-400" />}
                    {tcg ? <TcgSaleChip /> : null}
                    {best === "loud" ? <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Cheapest</span> : null}
                    {plainBest ? <BestPriceTag /> : null}
                  </p>
                  {plainBest ? <BestPriceNote has={hasMarketRows} className="mt-0.5" /> : null}
                  {isEbay ? <p className="pb-sub mt-0.5 text-xs text-slate-400">Cheapest matching listing we found</p> : null}
                  <p className="pb-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                    {o.condition ? <span className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-semibold text-slate-200">{o.condition}</span> : null}
                    {tcg ? <span>lowest listing</span> : null}
                    {tcg ? null : (
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
                <span className="pb-price shrink-0 text-right">
                  <span className={`num block text-base font-bold sm:text-lg ${best === "loud" ? "text-accent" : "text-white"}`}>{money(o.priceCents, country)}</span>
                  {pinned && i > 0 && open[0].priceCents > 0 ? (
                    <span className="num block text-[11px] text-slate-500">+{Math.round(((o.priceCents - open[0].priceCents) / open[0].priceCents) * 100)}% vs cheapest</span>
                  ) : null}
                </span>
                {/* The cart list (components/cart, owner 2026-11-06): every row; TCGplayer too since 2026-11-16. */}
                {o.host ? (
                  <CartAddButton href={o.href} productUrl={o.productUrl} storeName={o.label} title={name ?? slug ?? "Item"} detail={o.condition ?? null} priceCents={o.priceCents} currency={c.currency} image={image} className="pb-cart text-slate-300" />
                ) : null}
                <a href={o.href} target="_blank" rel={outboundRel()} data-retailer={o.retailer} data-page={page} data-card={slug} data-surface={surface} className={`${tcg ? "btn-tcg" : pinned || best === "loud" ? "btn-primary" : "btn-ghost"} hidden shrink-0 whitespace-nowrap sm:inline-flex sm:w-48`}>
                  {tcg ? "Buy on TCGplayer →" : isEbay ? "Buy on eBay →" : "View deal →"}
                </a>
                <a href={o.href} target="_blank" rel={outboundRel()} data-retailer={o.retailer} data-page={page} data-card={slug} data-surface={surface} className={`pb-go ${tcg ? "btn-tcg" : pinned || best === "loud" ? "btn-primary" : "btn-ghost"} shrink-0 px-3 sm:hidden`} aria-label={isEbay ? `Buy on ${o.label}` : `Buy at ${o.label}`}>
                  →
                </a>
              </li>,
              o === pins[pins.length - 1] ? <Fragment key="third-row">{thirdRow}</Fragment> : null,
              ...fetchAfter(o),
            ];
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
      {!hasEbayRow || showTcgRef || showTcgSearch ? (
        <ol className="divide-y divide-ink-800 border-t border-ink-800">
          {pins.length ? null : marketHead}
          {hasEbayRow ? null : (
            <li className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${PIN_OUTLINE.ebay}`}>
              <span className="w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-white">{ebayLabel(country)}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {preRelease
                    ? "Not released yet: eBay sellers set their own dispatch dates, so check each listing."
                    : `No ${ebayLabel(country)} price on file for this ${noun}. Search its current listings.`}{" "}
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span>
                </p>
              </div>
              {/* Every price row has an Add to cart (owner, 2026-11-17), a search row too: its line opens this tagged search and says "See today's price". */}
              <CartAddButton href={ebay} productUrl={ebay} storeName={ebayLabel(country)} title={name ?? slug ?? "Item"} detail="Search results" priceCents={0} currency={c.currency} image={image} className="text-slate-300" />
              <a href={ebay} target="_blank" rel={outboundRel()} data-retailer="ebay_no_listing" data-page={page} data-card={slug} data-surface="ebay_fallback" className="btn-primary shrink-0 whitespace-nowrap px-3 sm:w-48">
                Search eBay →
              </a>
            </li>
          )}
          {/* The slot's row (thirdRow) is the second row, right under eBay (owner, 2026-11-06). */}
          {hasEbayRow ? null : thirdRow}
          {showTcgRef && tcgRef?.marketUsd != null ? (
            <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-white">TCGplayer</span>
                  <TcgSaleChip />
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span>
                </p>
              </div>
              <span className="num shrink-0 text-right text-base font-bold text-white sm:text-lg">
                {money(usdCentsToCountry(tcgRef.marketUsd, country), country)}
              </span>
              {tcgRef.url ? (
                <CartAddButton href={tcgRef.href} productUrl={tcgRef.url} storeName="TCGplayer" title={name ?? slug ?? "Item"} priceCents={usdCentsToCountry(tcgRef.marketUsd, country)} currency={c.currency} image={image} className="pb-cart text-slate-300" />
              ) : null}
              <a href={tcgRef.href} target="_blank" rel={outboundRel()} data-retailer="tcgplayer" data-page={page} data-card={slug} data-surface="board_pinned" className="btn-tcg shrink-0 whitespace-nowrap px-3 sm:w-48">
                <span className="hidden sm:inline">Buy on TCGplayer →</span>
                <span className="sm:hidden">→</span>
              </a>
            </li>
          ) : null}
          {showTcgSearch ? (
            <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-white">TCGplayer</span>
                  <TcgSaleChip />
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  No TCGplayer price on file for this {noun}. See its current listings.{" "}
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span>
                </p>
              </div>
              <CartAddButton href={tcgSearchHref} productUrl={tcgRef?.url ?? tcgSearchHref} storeName="TCGplayer" title={name ?? slug ?? "Item"} detail="Search results" priceCents={0} currency={c.currency} image={image} className="text-slate-300" />
              <a href={tcgSearchHref} target="_blank" rel={outboundRel()} data-retailer="tcgplayer" data-page={page} data-card={slug} data-surface="tcg_fallback" className="btn-tcg shrink-0 whitespace-nowrap px-3 sm:w-48">
                {tcgRef?.href ? "Buy on TCGplayer →" : "Search TCGplayer →"}
              </a>
            </li>
          ) : null}
        </ol>
      ) : null}
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
                <span className="flex min-w-0 flex-1 items-center gap-2"><span className="truncate">{o.label}</span>{o.host && <StoreVote url={o.host} name={o.label} className="shrink-0 text-slate-500" />}</span>
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

/** Fetch TCG's marketplace row (Australia only): drawn like a store row but never ranked, never "Cheapest". Fetch's own
 *  tracked URL is used as sent; the price carries its date. */
function fetchRowLis(f: BoardModel["fetch"], o: { country: Country; page: string; slug?: string; now?: number; title?: string; image?: string | null }) {
  if (!f || o.country !== "AU") return [];
  return f.rows.map((r) => ({ price: r.priceCents, li: (
    <li key={`fetchtcg-${r.condition}-${r.priceCents}`} data-price-row="" data-cents={r.priceCents > 0 ? r.priceCents : undefined} data-paid={0} className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-white">Fetch TCG</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-semibold text-slate-200">{r.condition}</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            In stock
          </span>
          <span>postage at checkout</span>
          <span>price on {new Date(f.at).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" })}</span>
        </p>
      </div>
      <span className="num shrink-0 text-right text-base font-bold text-white sm:text-lg">{money(r.priceCents, o.country)}</span>
      <CartAddButton href={r.url} productUrl={r.url} storeName="Fetch TCG" title={o.title ?? o.slug ?? "Item"} detail={r.condition} priceCents={r.priceCents} currency={COUNTRIES[o.country].currency} image={o.image ?? null} className="pb-cart text-slate-300" />
      <a href={r.url} target="_blank" rel={outboundRel()} data-retailer="fetchtcg" data-page={o.page} data-card={o.slug} data-surface="board_row" className="btn-ghost hidden shrink-0 whitespace-nowrap sm:inline-flex sm:w-48">
        View on Fetch TCG →
      </a>
      <a href={r.url} target="_blank" rel={outboundRel()} data-retailer="fetchtcg" data-page={o.page} data-card={o.slug} data-surface="board_row" className="btn-ghost shrink-0 px-3 sm:hidden" aria-label="View on Fetch TCG">
        →
      </a>
    </li>
  ) }));
}
