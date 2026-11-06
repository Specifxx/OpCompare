"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { affiliateUrl, cardEbayQuery, ebayAffiliateUrl, ebaySearchUrl, onePieceEbayQuery, outboundRel } from "@/lib/affiliate";
import { usd } from "@/lib/format";
import type { ChaseTile } from "@/lib/listing-panel";
import type { Country } from "@/lib/country";
import { EbayWordmark } from "./AffiliateAds";
import { useCountry } from "./CountryProvider";

// The two side rails (owner, 2026-11-06: the DexCompare / MTG Compare layout, "the actual site is a little thinner and then you
// have the two ad banners, one for eBay, one for TCGplayer, on the sides … on the home page … and when you go to other pages"):
// the chase cards of MiniChaseAds (/api/chase, the same CDN-held answer), each one's live eBay listing in the visitor's market
// down the left beside the navigation rail, TCGplayer's market price down the right, ten tiles each that scroll.
//
//   • Browser only, from 1280px wide (every regular 16:9 and 16:10 screen) and a window tall enough for one whole tile. Nothing is
//     in the server HTML (no SEO change); the room beside the column is CSS (globals.css "The side rails"), so CLS is 0.
//   • Ad-free for Plus and Premium, like every ad (data-ad-placement; the column keeps its full width under :root[data-adfree]).
//   • Labelled "Ad", every link an affiliate link, data-surface `side_rails`.

export const MIN_WIDTH = 1280;
export const RAIL_W = 136;
const GUTTER = 12;
/** container-app's widest (1400px): from there the rails sit just outside the column instead of at the window's edges. */
const COLUMN_MAX = 1400;
const HDR = 64;
const HEAD = 30;
const NOTE = 34;
const PAD = 16;
export const TILE_H = 6 + Math.round(((RAIL_W - PAD - 12) * 7) / 5) + 4 + 18 + 20 + 6;
export const MAX_TILES = 10;
const symbolFor = (cur: string) => ({ USD: "US$", AUD: "A$", GBP: "£", SGD: "S$", CAD: "C$", EUR: "€" } as Record<string, string>)[cur] ?? `${cur} `;
const fmt = (cents: number, cur: string) => `${symbolFor(cur)}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TCG_SEARCH = "https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&view=grid";

/** Whether a window this tall holds a rail with one whole tile in view. Pure, for the tests. */
export function railFits(innerHeight: number): boolean {
  return innerHeight - HDR - 2 * GUTTER - HEAD - NOTE - PAD >= TILE_H;
}

type Tile = { key: string | number; href: string; image: string; name: string; price: string; retailer: string; card: string };

/** The rails' tiles, most valuable first. Pure, for the tests. */
export function railTiles(tiles: ChaseTile[], country: string): { ebay: Tile[]; tcg: Tile[] } {
  const byValue = [...tiles].sort((a, b) => b.marketUsd - a.marketUsd);
  // Live listings in the visitor's market first; the rest of the ten are eBay searches for the card (MiniChaseAds does the same),
  // so a market with few live listings still gets a full rail.
  const ebay = [...byValue]
    .sort((a, b) => Number(!!b.listings[country]) - Number(!!a.listings[country]))
    .slice(0, MAX_TILES)
    .map((t) => {
      const live = t.listings[country];
      return live
        ? { key: t.id, href: ebayAffiliateUrl(live.url, "side-rail"), image: live.imageUrl || t.imageUrl, name: t.name, price: fmt(live.priceCents, live.currency), retailer: "ebay_side", card: t.slug }
        : { key: t.id, href: ebaySearchUrl(country as Country, cardEbayQuery(t), "side-rail"), image: t.imageUrl, name: t.name, price: "Search eBay", retailer: "ebay_side_search", card: t.slug };
    });
  const tcg = byValue
    .filter((t) => t.marketUsd > 0)
    .slice(0, MAX_TILES)
    .map((t) => ({ key: t.id, href: affiliateUrl(`https://www.tcgplayer.com/product/${t.id}`, "tcgplayer_side", "/side-rail"), image: t.imageUrl, name: t.name, price: usd(t.marketUsd), retailer: "tcgplayer_side", card: t.slug }));
  return { ebay, tcg };
}

export function SideRails() {
  const { country } = useCountry();
  const [fit, setFit] = useState(false);
  const [tiles, setTiles] = useState<ChaseTile[] | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const update = () => setFit(mq.matches && railFits(window.innerHeight) && !document.documentElement.hasAttribute("data-adfree"));
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    if (!fit || tiles) return;
    let live = true;
    fetch("/api/chase")
      .then((r) => (r.ok ? r.json() : null))
      .then((t: ChaseTile[] | null) => live && Array.isArray(t) && setTiles(t))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [fit, tiles]);
  if (!fit || !tiles) return null;
  const { ebay, tcg } = railTiles(tiles, country);
  return (
    <>
      {ebay.length >= 2 && (
        <Rail side="left" label="Sponsored: One Piece cards on eBay" brand={<EbayWordmark className="!text-lg" />} accent="#4f9cf0" tiles={ebay} all={{ href: ebaySearchUrl(country as Country, onePieceEbayQuery("chase card"), "side-rail"), retailer: "ebay_side", label: "All on eBay →" }} note="Ad · we may earn" />
      )}
      {tcg.length >= 2 && (
        <Rail
          side="right"
          label="Sponsored: One Piece cards on TCGplayer"
          brand={
            <span className="text-[15px] font-black tracking-tight" aria-label="TCGplayer">
              <span className="text-white">TCG</span>
              <span className="text-sky-400">player</span>
            </span>
          }
          accent="#4fa3ff"
          tiles={tcg}
          all={{ href: affiliateUrl(TCG_SEARCH, "tcgplayer_side", "/side-rail"), retailer: "tcgplayer_side", label: "All on TCGplayer →" }}
          note={country !== "US" ? "Ad · prices in US$" : "Ad · we may earn"}
        />
      )}
    </>
  );
}


const RAIL = "side-rail fixed z-30 hidden flex-col rounded-2xl border border-ink-700/70 bg-ink-900 p-2 min-[1280px]:flex";
const LIST = "rail-scroll grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-y-auto overscroll-contain";
const TILE = "group flex flex-col rounded-xl border border-ink-700 bg-ink-950/40 p-1.5 transition-colors hover:border-[var(--ad-accent)]";

const railStyle = (side: "left" | "right", accent: string): CSSProperties => ({
  top: HDR + GUTTER,
  bottom: GUTTER,
  width: RAIL_W,
  // GUTTER outside the column, never closer than GUTTER to the navigation rail or the window's edge. 100% is the window's width
  // without its scrollbar (a fixed element's containing block), as the column's is.
  [side]: `calc(${side === "left" ? "var(--sidenav-w) + " : ""}max(${GUTTER}px, (100% - var(--sidenav-w)) / 2 - ${COLUMN_MAX / 2 + GUTTER + RAIL_W}px))`,
  ["--ad-accent" as string]: accent,
});

function Rail(props: { side: "left" | "right"; label: string; brand: ReactNode; accent: string; tiles: Tile[]; all: { href: string; retailer: string; label: string }; note: string }) {
  const { side, label, brand, accent, tiles, all, note } = props;
  return (
    <aside data-ad-placement="side-rail" aria-label={label} className={RAIL} style={railStyle(side, accent)}>
      <div className="mb-2 flex h-[22px] shrink-0 items-center justify-between px-1">
        {brand}
        <span className="rounded bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ad</span>
      </div>
      <ul role="list" className={LIST}>
        {tiles.map((t) => (
          <li key={t.key}>
            <a href={t.href} target="_blank" rel={outboundRel()} data-retailer={t.retailer} data-page="side-rail" data-card={t.card} data-surface="side_rails" title={`${t.name} · ${t.price}`} className={TILE}>
              <span className="relative block aspect-[5/7] w-full overflow-hidden rounded-md bg-ink-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt={t.name} width={112} height={157} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-0.5" />
              </span>
              <span className="mt-1 block h-[18px] truncate text-xs font-semibold leading-[18px] text-slate-200 group-hover:text-[var(--ad-accent)]">{t.name}</span>
              <span className="num block h-5 truncate text-[15px] font-bold leading-5 text-white">{t.price}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex h-[26px] shrink-0 flex-col justify-center px-1 text-[10px] leading-[13px] text-slate-400">
        <a href={all.href} target="_blank" rel={outboundRel()} data-retailer={all.retailer} data-page="side-rail" data-surface="side_rails" className="truncate font-bold" style={{ color: accent }}>
          {all.label}
        </a>
        <span className="truncate">{note}</span>
      </p>
    </aside>
  );
}
