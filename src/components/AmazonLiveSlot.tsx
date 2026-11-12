"use client";
// The right-hand part of the sealed page's Amazon row: on load it asks /api/amazon/sealed/<slug>?c=<market> (CDN-cached
// six hours) for Amazon's own price of this product. With one, the row shows the price with the time it was fetched and
// Amazon's disclaimer, as its licence requires, and the button opens Amazon's own item page; without one (no API access
// for this store yet, no match, or a price older than 24 hours) it keeps "See price" and the tagged search. The price is
// drawn here alone: never a board row, the cheapest, a deal, an alert or a basket.
import { useEffect, useState } from "react";
import { AMAZON_REL } from "@/lib/amazon";
import { CartAddButton } from "./cart/CartAddButton";

const MAX_AGE_MS = 24 * 3600_000;
export const AMAZON_PRICE_DISCLAIMER =
  "Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on Amazon at the time of purchase will apply to the purchase of this product.";

interface Live { status: string; url?: string; price?: string; priceCents?: number; currency?: string; at?: string; timeZone?: string; zoneLabel?: string }

export function AmazonLiveSlot({ country, slug, label, searchHref, page = "sealed", cart }: { country: string; slug: string; label: string; searchHref: string; page?: string; cart?: { title: string; image?: string | null } }) {
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    let on = true;
    fetch(`/api/amazon/sealed/${encodeURIComponent(slug)}?c=${encodeURIComponent(country)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Live | null) => {
        if (on && j?.status === "ok" && j.url && j.price && j.at && Date.now() - Date.parse(j.at) < MAX_AGE_MS) setLive(j);
      })
      .catch(() => null);
    return () => {
      on = false;
    };
  }, [country, slug]);
  const href = live?.url ?? searchHref;
  const when = live?.at ? new Date(live.at).toLocaleString("en-GB", { timeZone: live.timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
  const data = { "data-retailer": `amazon_${country.toLowerCase()}`, "data-page": page, "data-card": slug, "data-surface": live ? "amazon_live" : "amazon_check" };
  if (!live) return null;
  return (
    <>
      <span data-amazon-priced className="hidden" />
      {live ? (
        <span className="shrink-0 text-right" title={AMAZON_PRICE_DISCLAIMER}>
          <span className="num block text-base font-bold text-white sm:text-lg">{live.price}</span>
          <span className="block text-[10px] text-slate-500"><span className="text-emerald-400">In stock</span> · as of {when} {live.zoneLabel}*</span>
        </span>
      ) : null}
      {/* Like a store row (owner, 2026-11-06): a live price is in stock and goes in the cart list (a manual line). */}
      {live?.url && live.priceCents && live.currency && cart ? (
        <CartAddButton href={live.url} productUrl={live.url} storeName={label} title={cart.title} priceCents={live.priceCents} currency={live.currency} image={cart.image ?? null} className="text-slate-300" />
      ) : null}
      <a href={href} target="_blank" rel={AMAZON_REL} {...data} className="btn-primary hidden shrink-0 whitespace-nowrap sm:inline-flex sm:w-48">
        View on Amazon →
      </a>
      <a href={href} target="_blank" rel={AMAZON_REL} {...data} className="btn-primary shrink-0 px-3 sm:hidden" aria-label={`${live ? "View on" : "Check price on"} ${label}`}>
        →
      </a>
      {live ? <p className="basis-full text-[10px] leading-4 text-slate-500">* {AMAZON_PRICE_DISCLAIMER}</p> : null}
    </>
  );
}
