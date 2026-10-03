import Link from "next/link";
import { COUNTRIES, MARKETS, type Country } from "@/lib/country";
import type { OfferRow } from "@/lib/data";
import { affiliateUrl, ebayLabel, ebaySearchUrl, isPaidLink, outboundRel } from "@/lib/affiliate";
import { ago, money } from "@/lib/format";
import { usdCentsToCountry } from "@/lib/fx";
import { sourceLabel } from "@/lib/stores";
import { ReportPriceButton } from "./ReportPriceButton";

// The price comparison (RiftCompare's card-page board): every open offer in the
// visitor's market, cheapest first by ITEM price; sold-out stores folded below;
// eBay as a search of the visitor's own eBay (no API); TCGplayer's market
// price as a reference under the comparison, never in it.
export function PriceBoard({
  productId,
  offers,
  country,
  marketUsd,
  ebayQuery,
  page,
  title = "Price comparison",
  noun = "card",
}: {
  productId: number;
  offers: OfferRow[];
  country: Country;
  marketUsd: number | null;
  ebayQuery: string;
  page: string;
  title?: string;
  noun?: string;
}) {
  const c = COUNTRIES[country];
  const here = offers.filter((o) => o.market === country && o.currency === c.currency);
  const open = here.filter((o) => o.inStock).sort((a, b) => a.priceCents - b.priceCents);
  const sold = here.filter((o) => !o.inStock).sort((a, b) => a.priceCents - b.priceCents);
  const oldest = open.length ? open.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b)).updatedAt : null;
  const elsewhere = MARKETS.filter((m) => m !== country)
    .map((m) => {
      const best = offers.filter((o) => o.market === m && o.inStock).sort((a, b) => a.priceCents - b.priceCents)[0];
      return best ? { m, cents: best.priceCents } : null;
    })
    .filter((x): x is { m: Country; cents: number } => x != null);
  const ebay = ebaySearchUrl(country, ebayQuery, `${page}-board`);

  return (
    <section className="card-surface overflow-hidden" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-800 px-4 py-3 sm:px-5">
        <h2 className="text-lg text-white">
          {title} <span className="font-sans text-sm font-normal text-slate-400">({open.length}) · {c.place}</span>
        </h2>
        {oldest ? <span className="text-xs text-slate-500">oldest listing {ago(oldest)}</span> : null}
      </div>
      {open.length ? (
        <ol className="divide-y divide-ink-800">
          {open.map((o, i) => {
            const href = affiliateUrl(o.url, o.source === "tcgplayer" ? "tcgplayer" : o.source.replace("store:", ""), page);
            const tcg = o.source === "tcgplayer";
            return (
              <li key={`${o.source}-${o.market}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="num w-5 shrink-0 text-center text-sm text-slate-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-white">{sourceLabel(o.source)}</span>
                    {i === 0 ? <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Cheapest</span> : null}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                    {o.condition ? <span className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-semibold text-slate-200">{o.condition}</span> : null}
                    {tcg ? <span>lowest listing</span> : null}
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      In stock
                    </span>
                    <span>postage at checkout</span>
                    <span>updated {ago(o.updatedAt)}</span>
                    {isPaidLink(o.url) ? <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span> : null}
                  </p>
                </div>
                <span className="num shrink-0 text-right text-base font-bold text-accent sm:text-lg">{money(o.priceCents, country)}</span>
                <a href={href} target="_blank" rel={outboundRel()} data-retailer={o.source.replace("store:", "")} data-page={page} className="btn-primary hidden shrink-0 whitespace-nowrap sm:inline-flex sm:w-48">
                  {tcg ? "Buy on TCGplayer →" : "View deal →"}
                </a>
                <a href={href} target="_blank" rel={outboundRel()} data-retailer={o.source.replace("store:", "")} data-page={page} className="btn-primary shrink-0 px-3 sm:hidden" aria-label={`Buy at ${sourceLabel(o.source)}`}>
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
          <ReportPriceButton productId={productId} market={country} offers={open.map((o) => ({ source: o.source, label: sourceLabel(o.source) }))} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-800 bg-ink-850/50 px-4 py-3 sm:px-5">
        <span className="flex-1 text-sm text-slate-300">
          <span className="font-semibold text-white">{ebayLabel(country)}</span> — search live listings for this {noun}
        </span>
        <a href={ebay} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} className="btn-ebay-ghost min-h-10">
          Search {ebayLabel(country)} →
        </a>
      </div>

      {sold.length ? (
        <details className="border-t border-ink-800">
          <summary className="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
            {sold.length} out-of-stock {sold.length === 1 ? "store" : "stores"}
          </summary>
          <ul className="divide-y divide-ink-800 border-t border-ink-800">
            {sold.map((o) => (
              <li key={`${o.source}-sold`} className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-400">
                <span className="flex-1 truncate">{sourceLabel(o.source)}</span>
                <span className="text-xs">sold out · last {money(o.priceCents, country)}</span>
                <a href={affiliateUrl(o.url, o.source.replace("store:", ""), page)} target="_blank" rel={outboundRel()} className="text-xs font-semibold text-brand-400 hover:underline">
                  View →
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="space-y-1 border-t border-ink-800 px-5 py-4 text-center text-xs text-slate-500">
        {marketUsd != null ? (
          <p>
            Reference: TCGplayer market price{" "}
            <span className="num font-semibold text-slate-300">
              {country === "US" ? money(marketUsd, "US") : `≈ ${money(usdCentsToCountry(marketUsd, country), country)}`}
            </span>
            {country === "US" ? "" : ` (US$${(marketUsd / 100).toFixed(2)} converted)`} — not a listing.
          </p>
        ) : null}
        <p>
          Prices are collected from public store listings and may change. <Link href="/methodology" className="underline hover:text-slate-300">How we compare prices</Link>
        </p>
        <p>Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, OP Compare earns from qualifying purchases — at no extra cost to you.</p>
      </div>
    </section>
  );
}
