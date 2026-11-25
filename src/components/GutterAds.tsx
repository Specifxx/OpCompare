"use client";
// The gutter column (owner, 2026-11-25: "Why are the display ads at the very bottom of the site? … there's so much space on the left and
// the right side of the website"). OP Compare's left side is the menu (SideNav), so only the RIGHT side of a wide window has room, and
// OP Compare is a light-ad site: ONE labelled TCGplayer column there, the same /api/chase answer the banners and the dock read (one
// CDN-held request a page view, shared). This reverses "the side rails are gone" (2026-11-13) on the owner's word; unlike the old
// rails, the page column keeps its full width.
//
//   • Only where it fits: from GUTTER_MIN px wide, sized to the empty space right of the page (globals.css `.gutter-ads`), never over
//     the page, the header or the footer: it sits absolutely in the layout's content wrapper and its card is sticky under the header.
//   • Browser only: nothing in the server HTML (no SEO change), absolutely placed, so nothing moves when it mounts (CLS 0).
//   • Labelled "Ad", rel sponsored, tagged tcgplayer_gutter. TCGplayer only, never Amazon. Ad-free for Plus and Premium (data-adfree).
//   • Static: nothing animates, opens or covers anything; the tiles scroll inside the card on a short window.
import { useEffect, useState } from "react";
import { affiliateUrl, outboundRel } from "@/lib/affiliate";
import type { ChaseTile } from "@/lib/listing-panel";
import { useCountry } from "./CountryProvider";
import { load } from "./InlineAds";
import { railTiles, TCG_SEARCH, type Tile } from "./PhoneDockAds";

/** The narrowest window with room for the column right of the menu and the 1400px page (about 110px, 14px clear of it). */
export const GUTTER_MIN = 1880;
const BANNER = 4;
const MAX = 8;

/** The tiles after the banner's four, so a page never shows the same card twice side by side; all of them when too few are left. Pure. */
export function pastBanner<T>(tiles: T[]): T[] {
  const rest = tiles.slice(BANNER);
  return (rest.length >= MAX / 2 ? rest : tiles).slice(0, MAX);
}

export function GutterAds() {
  const { country } = useCountry();
  const [wide, setWide] = useState(false);
  const [chase, setChase] = useState<ChaseTile[] | null>(null);
  useEffect(() => {
    if (document.documentElement.matches("[data-adfree], .capacitor-native")) return;
    const mq = window.matchMedia(`(min-width: ${GUTTER_MIN}px)`);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!wide) return;
    let live = true;
    load().then((t) => live && setChase(t));
    return () => {
      live = false;
    };
  }, [wide]);
  if (!wide || !chase) return null;
  const tiles: Tile[] = pastBanner(railTiles(chase, country, "gutter").tcg.filter((t) => t.image));
  if (tiles.length < 2) return null;
  return (
    <div className="gutter-ads gutter-ads-right">
      <aside data-ad-placement="gutter-ads" aria-label="Sponsored: TCGplayer" className="gutter-card card-surface">
        <p className="flex shrink-0 items-center gap-1.5">
          <span className="rounded border border-ink-700 px-1.5 text-[11px] font-bold leading-[18px] text-slate-400">Ad</span>
          <span className="truncate text-sm font-bold tracking-tight text-white">TCGplayer</span>
        </p>
        <p className="mt-0.5 shrink-0 truncate text-[11px] leading-4 text-slate-400">{country === "US" ? "Market prices" : "Prices in US$"}</p>
        <ul role="list" className="gutter-list">
          {tiles.map((t) => (
            <li key={`${t.retailer}-${t.key}`}>
              <a href={t.href} target="_blank" rel={outboundRel()} data-retailer={t.retailer} data-card={t.card} data-surface="gutter_ads" title={`${t.name} · ${t.price}`} className="group block">
                <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.image} alt={t.name} width={160} height={213} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain" />
                </span>
                <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white group-hover:text-brand-300">{t.name}</span>
                <span className="block truncate text-sm font-bold tabular-nums leading-[18px] text-white">{t.price}</span>
                <span className="block truncate text-[10px] uppercase leading-[14px] tracking-wide text-slate-500">Market price</span>
              </a>
            </li>
          ))}
        </ul>
        <a href={affiliateUrl(TCG_SEARCH, "tcgplayer_gutter", "/gutter-ads")} target="_blank" rel={outboundRel()} data-retailer="tcgplayer_gutter" data-surface="gutter_ads" className="mt-2 block shrink-0 rounded-full bg-white px-2 py-1.5 text-center text-xs font-semibold text-ink-950 hover:bg-slate-200">
          See all <span aria-hidden="true">→</span>
          <span className="sr-only"> on TCGplayer</span>
        </a>
      </aside>
    </div>
  );
}
