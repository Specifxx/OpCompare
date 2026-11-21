import { Ago } from "./Ago";
import { outboundRel } from "@/lib/affiliate";

// The Black Friday strip on a sealed product's page (lib/bf-strip.ts; DECISIONS.md, "Black Friday strip on sealed pages",
// 2026-11-19): one short card of facts the page already holds, in the visitor's market, under the product's price summary.
// Never fixed or floating; the quick view and the phone strip ad are untouched. Its one link (2026-11-21, partner terms:
// TCGplayer's rate rises with the month's sales) is an "Ad"-labelled, tagged TCGplayer search for the product, on its own line:
// never a price, never ranked, never the cheapest.
export interface BlackFridayStripData {
  /** "Black Friday" or "Cyber Monday" (lib/holiday-strip.ts saleStrip). */
  label: string;
  /** "A$289.95 at Good Games" */
  cheapest: string | null;
  /** "Free shipping" or "+ $9.95 shipping", only from the store's own stated rate (lib/stores.ts), else null. */
  shipping: string | null;
  /** ISO time the cheapest price was read. */
  checked: string | null;
  /** Render time, so the server and the first client render agree (Ago). */
  now: number;
  /** "Pre-order · out 5 Dec", or null. */
  preorder: string | null;
  /** The history cue (lowCueText), or null. */
  cue: { text: string; lowest: boolean } | null;
  /** The tagged TCGplayer search for this product (affiliateUrl), or null. */
  tcgplayerHref?: string | null;
  /** The product's slug, for the click beacon's data-card. */
  slug?: string;
}

export function BlackFridayStrip({ label, cheapest, shipping, checked, now, preorder, cue, tcgplayerHref, slug }: BlackFridayStripData) {
  if (!cheapest && !preorder && !cue) return null;
  return (
    <section aria-label={`${label} price check`} data-bf-strip="" className="card-surface px-4 py-3 text-sm leading-6">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="chip border border-ink-700 bg-ink-850 font-semibold text-white">{label} check</span>
        {cheapest && (
          <span className="text-slate-300">
            Cheapest today <b className="num font-semibold text-white">{cheapest}</b>
          </span>
        )}
        {shipping && <span className={/^free/i.test(shipping) ? "font-medium text-emerald-400" : "text-slate-400"}>{shipping}</span>}
        {checked && (
          <span className="text-slate-400">
            checked <Ago at={checked} now={now} />
          </span>
        )}
        {preorder && <span className="font-medium text-gold">{preorder}</span>}
        {cue && <span className={cue.lowest ? "font-semibold text-emerald-400" : "text-slate-400"}>{cue.text}</span>}
      </p>
      {tcgplayerHref && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 border-t border-ink-700 pt-2">
          <span className="rounded border border-ink-700 px-1.5 text-[11px] font-semibold uppercase leading-5 text-slate-400">Ad</span>
          <a
            href={tcgplayerHref}
            target="_blank"
            rel={outboundRel()}
            data-retailer="tcgplayer"
            data-page="sealed"
            data-card={slug}
            data-surface="bf_strip"
            className="font-semibold text-white underline decoration-slate-600 underline-offset-2 hover:decoration-white"
          >
            See {label} prices on TCGplayer →
          </a>
        </p>
      )}
    </section>
  );
}
