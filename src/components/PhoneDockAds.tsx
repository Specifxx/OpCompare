"use client";

import { useEffect, useState, type ReactNode } from "react";
import { affiliateUrl, cardEbayQuery, ebayAffiliateUrl, ebaySearchUrl, outboundRel } from "@/lib/affiliate";
import { usd } from "@/lib/format";
import type { ChaseTile } from "@/lib/listing-panel";
import type { Country } from "@/lib/country";
import { EbayWordmark } from "./AffiliateAds";
import { useCountry } from "./CountryProvider";
import { AdDock, DockGate, DockTile, DOCK_LINK, type DockSide } from "./AdDock";

// The phone dock (owner, 2026-11-06) and the tile model shared with the in-page ad block (InlineAds.tsx). The side rails that used to
// live here are gone (owner, 2026-11-13: replaced by the one horizontal block inside the page).
//
// The dock: the chase cards from /api/chase (live eBay listings in the visitor's market, TCGplayer's market price), eBay and TCGplayer
// taking turns, in one bar along the foot of a screen under MIN_WIDTH, asked for only once the visitor scrolls (AdDock.tsx has the rules).

export const MIN_WIDTH = 1280;
export const MAX_TILES = 10;
const symbolFor = (cur: string) => ({ USD: "US$", AUD: "A$", GBP: "£", SGD: "S$", CAD: "C$", EUR: "€" } as Record<string, string>)[cur] ?? `${cur} `;
export const fmt = (cents: number, cur: string) => `${symbolFor(cur)}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const TCG_SEARCH = "https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&view=grid";

export type Tile = { key: string | number; href: string; image: string; name: string; price: string; retailer: string; card: string };

/** The in-page block's and the dock's tiles, most valuable first. Pure, for the tests. */
export function railTiles(tiles: ChaseTile[], country: string, where: "inline" | "dock" = "inline"): { ebay: Tile[]; tcg: Tile[] } {
  const byValue = [...tiles].sort((a, b) => b.marketUsd - a.marketUsd);
  // Live listings in the visitor's market first; the rest of the ten are eBay searches for the card,
  // so a market with few live listings still gets a full rail.
  const ebay = [...byValue]
    .sort((a, b) => Number(!!b.listings[country]) - Number(!!a.listings[country]))
    .slice(0, MAX_TILES)
    .map((t) => {
      const live = t.listings[country];
      return live
        ? { key: t.id, href: ebayAffiliateUrl(live.url, `${where}-ads`), image: live.imageUrl || t.imageUrl, name: t.name, price: fmt(live.priceCents, live.currency), retailer: `ebay_${where}`, card: t.slug }
        : { key: t.id, href: ebaySearchUrl(country as Country, cardEbayQuery(t), `${where}-ads`), image: t.imageUrl, name: t.name, price: "Search eBay", retailer: `ebay_${where}_search`, card: t.slug };
    });
  const tcg = byValue
    .filter((t) => t.marketUsd > 0)
    .slice(0, MAX_TILES)
    .map((t) => ({ key: t.id, href: affiliateUrl(`https://www.tcgplayer.com/product/${t.id}`, `tcgplayer_${where}`, `/${where}-ads`), image: t.imageUrl, name: t.name, price: usd(t.marketUsd), retailer: `tcgplayer_${where}`, card: t.slug }));
  return { ebay, tcg };
}

export function PhoneDockAds() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const update = () => setNarrow(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (!narrow) return null;
  return (
    <DockGate minWidth={MIN_WIDTH}>
      <PhoneDock />
    </DockGate>
  );
}

/**
 * The phone dock (owner, 2026-11-06: "on mobile … in the best way that doesn't interrupt user experience"): the
 * tiles from the same /api/chase answer (live eBay listings only, no bare searches), eBay and TCGplayer taking turns, in one bar
 * along the foot of a narrow screen. AdDock.tsx has the rules: it yields to every ad unit ([data-ad-placement]), never shows on a
 * card page (the buy bar), for Plus/Premium (data-adfree) or in the app (its own banner); the feedback button lifts above it
 * (globals.css, html[data-ad-dock]). Tagged dock-rail / tcgplayer_dock, data-surface ad_dock.
 */
function PhoneDock() {
  const { country } = useCountry();
  const [tiles, setTiles] = useState<ChaseTile[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/chase")
      .then((r) => (r.ok ? r.json() : null))
      .then((t: ChaseTile[] | null) => live && Array.isArray(t) && setTiles(t))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (!tiles) return null;
  const { ebay, tcg } = railTiles(tiles, country, "dock");
  const tcgBrand = (
    <span className="font-black tracking-tight" aria-label="TCGplayer">
      <span className="text-white">TCG</span>
      <span className="text-sky-400">player</span>
    </span>
  );
  const link = (t: Tile, brand: ReactNode) => (
    <a key={t.key} href={t.href} target="_blank" rel={outboundRel()} data-retailer={t.retailer} data-page="dock-rail" data-card={t.card} data-surface="ad_dock" title={`${t.name} · ${t.price}`} className={DOCK_LINK}>
      <DockTile img={t.image} alt={t.name} brand={brand} title={t.name} price={t.price} cta="View" />
    </a>
  );
  const sides: DockSide[] = [];
  const live = ebay.filter((t) => t.retailer === "ebay_dock");
  if (live.length >= 2) sides.push({ key: "ebay", items: live.map((t) => link(t, <EbayWordmark className="!text-[11px]" />)) });
  if (tcg.length >= 2) sides.push({ key: "tcgplayer", items: tcg.map((t) => link(t, tcgBrand)) });
  if (sides.length === 0) return null;
  return <AdDock label="Sponsored: One Piece cards on eBay and TCGplayer" sides={sides} placement="dock-rail" minWidth={MIN_WIDTH} yieldTo="[data-ad-placement]" />;
}
