import Link from "next/link";
import { COUNTRIES, type Country } from "@/lib/country";
import type { SealedLite } from "@/lib/data";
import type { ProductBoard } from "@/lib/preorders";
import { ebayLabel, ebaySearchUrl, onePieceEbayQuery, outboundRel, affiliateUrl } from "@/lib/affiliate";
import { money, usd } from "@/lib/format";

const VISIBLE = 5;

/**
 * One pre-order product: the cheapest rows in the visitor's market (stores'
 * pre-order prices, TCGplayer's cheapest listing and eBay's, ranked together by
 * item price), the TCGplayer market price as a reference, and an eBay search
 * that is always offered (a search, never a row, claiming no price). Server
 * component; every outbound link is the affiliate-tagged one lib/quick-view built.
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
  const ebaySearch = ebaySearchUrl(country, onePieceEbayQuery(`${s.name.replace(/\s+-\s+/g, " ")} English`).replace(/\bbooster box\b/i, "booster (box,display)"), "preorders-product");
  const tcgHref = affiliateUrl(s.tcgplayerUrl, "tcgplayer", `/${page}`);
  const shown = board.rows.slice(0, VISIBLE);
  const more = board.rows.slice(VISIBLE);
  const lowest = board.rows[0] ?? null;

  const row = (r: ProductBoard["rows"][number], i: number) => (
    <li key={`${r.source}-${i}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="num w-5 shrink-0 text-center text-sm text-slate-500">{i + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-white">{r.label}</span>
          {i === 0 ? <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Cheapest</span> : null}
          {r.source === "tcgplayer" ? <span className="rounded bg-[#6d3fd9]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-300">TCGplayer</span> : null}
          {r.ebay ? <span className="rounded bg-[#0064d2]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300">eBay</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {r.source === "tcgplayer" ? "lowest listing · " : r.ebay ? "cheapest matching listing · " : "pre-order · "}
          {r.postage}
        </p>
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
        className={`${r.ebay ? "btn-ebay" : r.source === "tcgplayer" ? "btn-tcg" : "btn-primary"} shrink-0 px-3 sm:w-44 sm:px-4`}
        aria-label={`${r.ebay ? "Buy on eBay" : r.source === "tcgplayer" ? "Buy on TCGplayer" : "Pre-order at"} ${r.label}`}
      >
        <span className="hidden sm:inline">{r.source === "tcgplayer" ? "Buy on TCGplayer →" : r.ebay ? "Buy on eBay →" : "Pre-order →"}</span>
        <span className="sm:hidden">→</span>
      </a>
    </li>
  );

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

      {board.rows.length ? (
        <>
          <ol className="divide-y divide-ink-800">{shown.map(row)}</ol>
          {more.length ? (
            <details className="border-t border-ink-800">
              <summary className="cursor-pointer px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">
                {more.length} more {more.length === 1 ? "price" : "prices"}
              </summary>
              <ol className="divide-y divide-ink-800 border-t border-ink-800">{more.map((r, i) => row(r, i + VISIBLE))}</ol>
            </details>
          ) : null}
        </>
      ) : (
        <div className="px-5 py-5 text-sm text-slate-300">
          <p>No {c.adjective} store we track has a pre-order for this yet.{s.marketUsd ? " TCGplayer's market price is shown above." : ""}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-800 bg-ink-850/50 px-4 py-3 sm:px-5">
        <span className="flex-1 text-sm text-slate-300">
          {board.cheapest.ebay ? (
            <>
              <span className="font-semibold text-white">{ebayLabel(country)}</span> has live listings for this
            </>
          ) : (
            <>
              Prefer a marketplace? Check <span className="font-semibold text-white">{ebayLabel(country)}</span> and TCGplayer
            </>
          )}
        </span>
        <a href={ebaySearch} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={page} data-card={s.slug} data-surface="preorder_ebay" className="btn-ebay min-h-10">
          Search eBay →
        </a>
        <a href={tcgHref} target="_blank" rel={outboundRel()} data-retailer="tcgplayer" data-page={page} data-card={s.slug} data-surface="preorder_tcgplayer" className="btn-tcg min-h-10">
          TCGplayer →
        </a>
      </div>
    </section>
  );
}
