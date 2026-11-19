// The Black Friday strip's data for a sealed product page in the visitor's market (lib/bf-strip.ts has the rules; DECISIONS.md,
// "Black Friday strip on sealed pages", 2026-11-19). Pure over what the page already loaded: its offers and its history. No read.
import type { BlackFridayStripData } from "@/components/BlackFridayStrip";
import { bfStripOn, cueDate, lowCue, lowCueText } from "./bf-strip";
import type { Country } from "./country";
import type { OfferRow } from "./data";
import { money } from "./format";
import { saleStrip } from "./holiday-strip";
import { marketRows } from "./quick-view";
import { isEbaySource, sourceLabel, storeForSource } from "./stores";

export function bfStripFor(opts: {
  offers: OfferRow[];
  country: Country;
  /** The headline price in this market (lib/price.ts headline, kind "listing"), the series' own basis. */
  currentCents: number | null;
  /** The visitor's market's daily lows (price-history-view.ts), oldest first. */
  history: { x: string; y: number | null }[];
  presale: boolean;
  releasedOn: string | null;
  now?: number;
}): BlackFridayStripData | null {
  const now = opts.now ?? Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const sale = saleStrip(today);
  if (!sale || !bfStripOn(today)) return null;
  const fmt = (c: number) => money(c, opts.country);
  // The cheapest open store or TCGplayer row (eBay has its own pinned row and is never "the cheapest" here).
  const best = marketRows(opts.offers, opts.country).filter((o) => !isEbaySource(o.source)).reduce<OfferRow | null>((b, o) => (!b || o.priceCents < b.priceCents ? o : b), null);
  let shipping: string | null = null;
  if (best) {
    const store = storeForSource(best.source);
    if (store?.freeOverCents != null && best.priceCents >= store.freeOverCents) shipping = "Free shipping";
    else if (best.shippingCents === 0) shipping = "Free shipping";
    else if (best.shippingCents != null) shipping = `+ ${fmt(best.shippingCents)} shipping`;
    else if (store?.shippingCents != null) shipping = store.shippingCents === 0 ? "Free shipping" : `+ ${fmt(store.shippingCents)} shipping`;
  }
  const cue = lowCue(opts.history.map((p) => ({ day: p.x, cents: p.y })), opts.currentCents, today);
  const out: BlackFridayStripData = {
    label: sale.name,
    cheapest: best ? `${fmt(best.priceCents)} at ${sourceLabel(best.source, opts.country)}` : null,
    shipping,
    checked: best?.updatedAt ?? null,
    now,
    preorder: opts.presale && opts.releasedOn && opts.releasedOn >= today ? `Pre-order · out ${cueDate(opts.releasedOn, today)}` : opts.presale ? "Pre-order" : null,
    cue: cue ? { text: lowCueText(cue, fmt, today), lowest: cue.kind === "lowest" } : null,
  };
  return out.cheapest || out.preorder || out.cue ? out : null;
}
