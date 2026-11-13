"use client";

import { useEffect, useState } from "react";
import { affiliateUrl, ebaySearchUrl, onePieceEbayQuery, outboundRel } from "@/lib/affiliate";
import type { ChaseTile } from "@/lib/listing-panel";
import type { Country } from "@/lib/country";
import { useCountry } from "./CountryProvider";
import { railTiles, TCG_SEARCH, type Tile } from "./PhoneDockAds";

// The one in-page ad block (owner, 2026-11-13, replacing the side rails and the small MiniChaseAds / EbayChase / EbayPicks strips):
// a full-column-width card with a row of larger tiles (a live eBay listing in the visitor's market first, TCGplayer's market price
// after), each naming its marketplace in words, labelled "Ad" and tagged ebay_inline / tcgplayer_inline, surface `inline_ads`.
//
//   • Browser only: nothing in the server HTML (no SEO change). It asks /api/chase (the CDN-held answer the phone dock uses) after
//     hydration, and the card's height is reserved from the first client paint (CLS 0).
//   • Calm and native: the site's own card surface, hairline border and slate text; no brand colours, no pop-up, nothing fixed.
//   • Ad-free for Plus and Premium like every ad (data-ad-placement is hidden under the data-adfree hint).
//   • eBay and TCGplayer only (never Amazon), every link rel sponsored. Never a store row, a best price, a deal or an alert. One per
//     page: pages place it once; articles and the quick views never carry it.

export const INLINE_MAX = 6;

/** The block's tiles: up to three live eBay listings, then TCGplayer's to fill six; a side with fewer than two tiles is dropped. Pure. */
export function inlineTiles(chase: ChaseTile[], country: string): { ebay: Tile[]; tcg: Tile[] } {
  const all = railTiles(chase, country, "inline");
  const ebayAll = all.ebay.filter((t) => t.retailer === "ebay_inline" && t.image);
  const tcgAll = all.tcg.filter((t) => t.image);
  const eN = ebayAll.length >= 2 ? Math.min(ebayAll.length, tcgAll.length >= 2 ? 3 : INLINE_MAX) : 0;
  const tN = tcgAll.length >= 2 ? Math.min(tcgAll.length, INLINE_MAX - eN) : 0;
  const ebay = ebayAll.slice(0, eN);
  const tcg = tcgAll.slice(0, tN);
  return ebay.length + tcg.length >= 3 ? { ebay, tcg } : { ebay: [], tcg: [] };
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

const TILE_W = 152;
const BLOCK_MIN_H = 24 + Math.round((TILE_W * 7) / 5) + 8 + 36 + 22 + 28 + 40;

export function InlineAds({ page, className = "" }: { page: string; className?: string }) {
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
  const { ebay, tcg } = chase ? inlineTiles(chase, country) : { ebay: [], tcg: [] };
  const tiles = [...ebay.map((t) => ({ t, brand: "eBay" })), ...tcg.map((t) => ({ t, brand: "TCGplayer" }))];
  if (chase && tiles.length === 0) return null;
  const hasEbay = ebay.length > 0;
  const hasTcg = tcg.length > 0;
  return (
    <aside data-ad-placement="inline-ads" aria-label="Sponsored: One Piece cards on eBay and TCGplayer" className={`card-surface min-w-0 p-4 ${className}`} style={{ minHeight: BLOCK_MIN_H }}>
      <p className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded border border-ink-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Ad</span>
        <span>One Piece cards on {hasEbay && hasTcg ? "eBay and TCGplayer" : hasEbay ? "eBay" : "TCGplayer"}</span>
      </p>
      {chase && (
        <>
          <ul role="list" className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {tiles.map(({ t, brand }) => (
              <li key={`${t.retailer}-${t.key}`} className="shrink-0 snap-start" style={{ width: TILE_W }}>
                <a
                  href={t.href}
                  target="_blank"
                  rel={outboundRel()}
                  data-retailer={t.retailer}
                  data-page={page}
                  data-card={t.card}
                  data-surface="inline_ads"
                  title={`${t.name} · ${t.price}`}
                  className="group flex flex-col"
                >
                  <span className="relative block aspect-[5/7] w-full overflow-hidden rounded-md border border-ink-700 bg-ink-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.image} alt={t.name} width={TILE_W} height={Math.round((TILE_W * 7) / 5)} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-0.5" />
                  </span>
                  <span className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{brand}</span>
                  <span className="mt-0.5 line-clamp-2 block h-9 text-xs font-semibold leading-[18px] text-slate-200 group-hover:text-white">{t.name}</span>
                  <span className="num mt-0.5 block text-sm font-bold text-white">{t.price}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-tight text-slate-400">
            {hasEbay && (
              <a href={ebaySearchUrl(country as Country, onePieceEbayQuery("chase card"), "inline-ads")} target="_blank" rel={outboundRel()} data-retailer="ebay_inline_search" data-page={page} data-surface="inline_ads" className="font-semibold underline-offset-2 hover:underline">
                See more on eBay →
              </a>
            )}
            {hasTcg && (
              <a href={affiliateUrl(TCG_SEARCH, "tcgplayer_inline", `/${page}`)} target="_blank" rel={outboundRel()} data-retailer="tcgplayer_inline" data-page={page} data-surface="inline_ads" className="font-semibold underline-offset-2 hover:underline">
                See more on TCGplayer →
              </a>
            )}
            <span>Affiliate links: OP Compare may earn a commission, at no extra cost to you.{hasTcg && country !== "US" ? " TCGplayer prices in US$." : ""}</span>
          </p>
        </>
      )}
    </aside>
  );
}
