"use client";

import { ebayAffiliateUrl, ebayLabel, ebaySearchUrl, onePieceEbayQuery, outboundRel } from "@/lib/affiliate";
import { moneyCode } from "@/lib/format";
import { useCountry } from "./CountryProvider";

/** A fresh eBay listing for this card in one market (the daily eBay pass's offer row). */
export interface EbayTopListing {
  priceCents: number;
  currency: string;
  url: string;
}

// The card page's big eBay button, at the top of the header card (owner,
// 2026-10-07). With a fresh listing from the daily eBay pass in the visitor's
// market it says "from <price> on eBay" and opens that listing; without one it
// is an EPN-tagged eBay SEARCH for the card. Filled, eBay blue, full width on a
// phone. A buy path beside the comparison, never ranked into it; the
// disclosure sits right under it.
export function EbayTopButton({
  query,
  name,
  listings,
  card,
  className = "mt-4",
}: {
  className?: string;
  query: string;
  name: string;
  listings: Partial<Record<string, EbayTopListing>>;
  card: string;
}) {
  const { country } = useCountry();
  const live = listings[country];
  const label = ebayLabel(country);
  const href = live ? ebayAffiliateUrl(live.url, "card-top") : ebaySearchUrl(country, onePieceEbayQuery(query), "card-top");
  return (
    <div className={className}>
      <a
        href={href}
        target="_blank"
        rel={outboundRel()}
        data-retailer={live ? "ebay_top_listing" : "ebay_top_search"}
        data-page="card"
        data-card={card}
        data-surface="ebay_top"
        className="group flex w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#0064d2] to-[#2b8cff] px-4 py-3.5 text-[#ffffff] shadow-lg shadow-[#0064d2]/25 ring-1 ring-[#ffffff]/10 transition hover:brightness-110 hover:shadow-[#0064d2]/40 sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-[#ffffff] font-sans text-lg font-bold tracking-tight" aria-label="eBay">
            <span>
              <span className="text-[#e53238]">e</span>
              <span className="text-[#0064d2]">b</span>
              <span className="text-[#f5af02]">a</span>
              <span className="text-[#86b817]">y</span>
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold leading-tight sm:text-lg">
              {live ? `Buy on eBay from ${moneyCode(live.priceCents, live.currency)}` : `Shop ${name} on eBay`}
              <span className="sm:hidden"> →</span>
            </span>
            <span className="block truncate text-xs text-[#ffffff]/80">
              {live ? `Cheapest matching Buy It Now on ${label}` : `Raw, graded and sealed listings on ${label}`}
            </span>
          </span>
        </span>
        <span className="hidden shrink-0 rounded-lg bg-[#ffffff] px-3 py-1.5 text-sm font-extrabold text-[#0064d2] transition group-hover:translate-x-0.5 sm:inline">
          {live ? "View listing →" : "Search eBay →"}
        </span>
      </a>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        Affiliate link: as an eBay Partner Network affiliate, OP Compare earns from qualifying purchases — at no extra cost to you.
      </p>
    </div>
  );
}
