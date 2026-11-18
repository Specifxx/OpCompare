"use client";

import { useEffect, useState } from "react";
import { applyAdLook } from "@/lib/ad-look";
import { affiliateUrl, ebaySearchUrl, onePieceEbayQuery, outboundRel } from "@/lib/affiliate";
import type { ChaseTile } from "@/lib/listing-panel";
import type { Country } from "@/lib/country";
import { useCountry } from "./CountryProvider";
import { railTiles, TCG_SEARCH, type Tile } from "./PhoneDockAds";

// The two big ad banners (owner, 2026-11-14: "separate big ad banners for TCGplayer and eBay", replacing the one mixed block of
// 2026-11-13): one banner for eBay and one for TCGplayer, side by side from lg and stacked below it, each with its own "Ad" label, a
// big "Browse on …" button and up to four real cards (a live eBay listing in the visitor's market; TCGplayer's market price), labelled
// and tagged ebay_inline / tcgplayer_inline, surface `inline_ads`.
//
//   • At the TOP of every page: directly under the hero on the home page, under the page's header elsewhere (owner, 2026-11-14).
//   • Browser only: nothing in the server HTML (no SEO change). It asks /api/chase (the CDN-held answer the phone dock uses) after
//     hydration, and both banners' height is reserved from the first client paint (CLS 0). A side with fewer than two tiles keeps its
//     banner and shows the button alone.
//   • Calm and native: the site's own card surface, hairline border and slate text; no brand colours, no pop-up, nothing fixed.
//   • Ad-free for Plus and Premium like every ad (data-ad-placement is hidden under the data-adfree hint).
//   • Only these two retailers, every link rel sponsored. Never a store row, a best price, a deal or an alert. One of each per page:
//     pages place the pair once; articles and the quick views never carry it.

export const INLINE_MAX = 4;

/** The banners' tiles: up to four live eBay listings in the visitor's market and up to four TCGplayer cards; a side with fewer than two is empty. Pure. */
export function inlineTiles(chase: ChaseTile[], country: string): { ebay: Tile[]; tcg: Tile[] } {
  const all = railTiles(chase, country, "inline");
  const ebayAll = all.ebay.filter((t) => t.retailer === "ebay_inline" && t.image);
  const tcgAll = all.tcg.filter((t) => t.image);
  return { ebay: ebayAll.length >= 2 ? ebayAll.slice(0, INLINE_MAX) : [], tcg: tcgAll.length >= 2 ? tcgAll.slice(0, INLINE_MAX) : [] };
}

// One fetch per page view.
let inflight: Promise<ChaseTile[] | null> | null = null;
function load(): Promise<ChaseTile[] | null> {
  if (!inflight) {
    inflight = fetch("/api/chase")
      .then((r) => (r.ok ? (r.json() as Promise<ChaseTile[]>) : null))
      .then((t) => (Array.isArray(t) ? t : null))
      .catch(() => null);
  }
  return inflight;
}

/** One banner's height: padding 32 + head 44 + tiles 176 + note 14 (+ gap). */
export const BANNER_H = 280;

function Banner({ brand, tag, headline, cta, ctaHref, ctaRetailer, tiles, note, page }: { brand: string; tag: "ebay" | "tcg"; headline: string; cta: string; ctaHref: string; ctaRetailer: string; tiles: Tile[]; note: string; page: string }) {
  return (
    <aside data-ad-placement="inline-ads" data-banner={tag} aria-label={`Sponsored: ${headline}`} className="card-surface flex min-w-0 flex-col overflow-hidden p-3 sm:p-4" style={{ height: BANNER_H }}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="rounded border border-ink-700 px-1.5 text-[11px] font-bold leading-[18px] text-slate-400">Ad</span>
            <span className="text-base font-bold tracking-tight text-white">{brand}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{headline}</p>
        </div>
        <a href={ctaHref} target="_blank" rel={outboundRel()} data-retailer={ctaRetailer} data-page={page} data-surface="inline_ads" className="shrink-0 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-950 hover:bg-slate-200 sm:text-sm">
          {cta} →
        </a>
      </div>
      <ul role="list" className="mt-3 flex h-[176px] shrink-0 snap-x gap-3 overflow-x-auto overflow-y-hidden">
        {tiles.map((t) => (
          <li key={`${t.retailer}-${t.key}`} className="w-[120px] shrink-0 snap-start">
            <a href={t.href} target="_blank" rel={outboundRel()} data-retailer={t.retailer} data-page={page} data-card={t.card} data-surface="inline_ads" title={`${t.name} · ${t.price}`} className="group flex h-full flex-col">
              <span className="relative block h-[100px] w-full overflow-hidden rounded-md border border-ink-700 bg-ink-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt={t.name} width={120} height={100} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-0.5" />
              </span>
              <span className="mt-1.5 line-clamp-2 block h-8 text-[11px] font-semibold leading-4 text-slate-200 group-hover:text-white">{t.name}</span>
              <span className="num block h-[18px] truncate text-sm font-bold leading-[18px] text-white">{t.price}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-auto h-3.5 truncate text-[11px] leading-[14px] text-slate-400">{note}</p>
    </aside>
  );
}

export function InlineAds({ page, className = "" }: { page: string; className?: string }) {
  useEffect(() => applyAdLook(), []);
  const { country } = useCountry();
  const [chase, setChase] = useState<ChaseTile[] | null | undefined>(undefined);
  useEffect(() => {
    if (document.documentElement.hasAttribute("data-adfree")) return;
    let live = true;
    load().then((t) => live && setChase(t));
    return () => {
      live = false;
    };
  }, []);
  if (chase === null) return null;
  if (chase === undefined) {
    return (
      <div className={`grid gap-3 lg:grid-cols-2 ${className}`} aria-hidden="true" data-ad-placement="inline-ads">
        <div style={{ height: BANNER_H }} />
        <div style={{ height: BANNER_H }} />
      </div>
    );
  }
  const { ebay, tcg } = inlineTiles(chase, country);
  const ebayHref = ebaySearchUrl(country as Country, onePieceEbayQuery("chase card"), "inline-ads");
  const tcgHref = affiliateUrl(TCG_SEARCH, "tcgplayer_inline", `/${page}`);
  return (
    <div className={`grid gap-3 lg:grid-cols-2 ${className}`}>
      <Banner
        brand="eBay"
        tag="ebay"
        headline="One Piece cards on eBay · live listings"
        cta="Browse on eBay"
        ctaHref={ebayHref}
        ctaRetailer="ebay_inline_search"
        tiles={ebay}
        note="Affiliate links: OP Compare may earn a commission, at no extra cost to you."
        page={page}
      />
      <Banner
        brand="TCGplayer"
        tag="tcg"
        headline="One Piece cards on TCGplayer · market prices"
        cta="Browse on TCGplayer"
        ctaHref={tcgHref}
        ctaRetailer="tcgplayer_inline"
        tiles={tcg}
        note={`Affiliate links: OP Compare may earn a commission, at no extra cost to you.${country !== "US" ? " Prices in US$." : ""}`}
        page={page}
      />
    </div>
  );
}
