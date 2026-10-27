import type { Country } from "@/lib/country";
import { money } from "@/lib/format";
import { outboundRel } from "@/lib/affiliate";
import type { BuyRow } from "@/lib/quick-view";

/** Marks the top buy block for CardStickyBuyBar's observer. */
export const TOP_BUY_ATTR = "data-top-buy";

// The card page's phone buy path, top half (RiftCompare's CardTopBuy): below lg
// the comparison starts well below the first screen, so the cheapest open
// listing in the visitor's market and its Buy button sit right under the card's
// name. The row comes from cheapestBuyRow (lib/quick-view.ts), the board's own
// ranking, so it is always the comparison's #1 row.
export function CardTopBuy({
  best,
  alt,
  country,
  page,
  slug,
}: {
  best: BuyRow | null;
  /** paidAlternativeRow: the cheapest paid row within 20% when a non-paying store is cheapest. */
  alt?: { row: BuyRow; pctMore: number } | null;
  country: Country;
  page: string;
  slug: string;
}) {
  if (!best) return null;
  return (
    <div {...{ [TOP_BUY_ATTR]: "" }} className="mt-4 rounded-lg border border-brand-500/30 bg-brand-500/[0.06] p-3 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cheapest</p>
          <p className="num text-lg font-bold text-accent">{money(best.priceCents, country)}</p>
          <p className="truncate text-xs text-slate-400">
            at {best.label} · {best.postage}
          </p>
        </div>
        <a
          href={best.href}
          target="_blank"
          rel={outboundRel()}
          data-retailer={best.retailer}
          data-page={page}
          data-card={slug}
          data-surface="card_top_buy"
          className={`${best.ebay ? "btn-ebay" : "btn-primary"} shrink-0`}
        >
          Buy →
        </a>
      </div>
      {alt ? (
        <div className="mt-2 flex items-center gap-2 border-t border-ink-700/60 pt-1 text-xs text-slate-400">
          <a
            href={alt.row.href}
            target="_blank"
            rel={outboundRel()}
            data-retailer={alt.row.retailer}
            data-page={page}
            data-card={slug}
            data-surface="card_top_alt"
            className="block min-w-0 flex-1 truncate py-2 font-semibold text-brand-300 hover:underline"
          >
            or <span className="num">{money(alt.row.priceCents, country)}</span> on {altName(alt.row)}
            {alt.pctMore > 0 ? ` (+${alt.pctMore}%)` : ""} →
          </a>
          <span className="shrink-0 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">Paid link</span>
        </div>
      ) : null}
    </div>
  );
}

function altName(r: BuyRow): string {
  if (r.ebay) return "eBay";
  if (r.source.startsWith("tcgplayer")) return "TCGplayer";
  return r.label;
}
