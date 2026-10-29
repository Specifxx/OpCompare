"use client";

import { affiliateUrl, outboundRel } from "@/lib/affiliate";
import { usd } from "@/lib/format";
import type { ChaseTile } from "@/lib/listing-panel";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { useCountry } from "./CountryProvider";

// A card's TCGplayer product page: the catalogue id IS TCGplayer's productId.
const productUrl = (id: number) => `https://www.tcgplayer.com/product/${id}`;
const SEARCH = "https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&view=grid";

/**
 * The TCGplayer half of the chase-card banner (owner, 2026-10-28: "more
 * TCGplayer ads … with the cards there"): the same dearest chase printings as
 * the eBay strip above it, each with its art and TCGplayer's market price,
 * linking to the card on TCGplayer through the Impact link. A real price from
 * the snapshot, never a "cheapest" claim; labelled "Ad"; hidden for ad-free
 * members (data-ad-placement); the disclosure sits right under it. TCGplayer
 * Direct does not ship One Piece to Australia (only Magic, Pokémon and
 * Yu-Gi-Oh! singles since 2026-10-07), so outside the US the line just says
 * it is the US marketplace.
 *
 * Drawn in the Gundam Compare card-strip design since 2026-10-29 (owner: "I
 * absolutely love it … every site"): a boxed, horizontally scrolling row with
 * the price on a badge over the art, a "Shop TCGplayer" button and an end tile.
 */
export function TcgplayerChaseStrip({
  tiles,
  heading = "Top One Piece cards on TCGplayer",
  page,
  limit = 12,
  className = "",
}: {
  tiles: ChaseTile[];
  heading?: string;
  page: string;
  limit?: number;
  className?: string;
}) {
  const { country } = useCountry();
  const ordered = tiles.filter((t) => t.marketUsd > 0).sort((a, b) => b.marketUsd - a.marketUsd).slice(0, limit);
  if (ordered.length < 3) return null;
  const searchHref = affiliateUrl(SEARCH, "tcgplayer_strip", `/${page}`);
  return (
    <section
      data-ad-placement="tcgplayer-strip"
      aria-label={heading}
      className={`overflow-hidden rounded-xl border border-[#1f6fe5]/35 bg-ink-900/60 bg-gradient-to-br from-[#1f6fe5]/[0.08] to-transparent ${className}`}
    >
      <div className="flex items-center gap-3 px-4 pt-3">
        <span className="shrink-0 text-xl font-black tracking-tight" aria-label="TCGplayer">
          <span className="text-white">TCG</span>
          <span className="text-[#4fa3ff]">player</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold leading-tight text-white">{heading}</p>
          <p className="truncate text-[11px] text-slate-400">
            {country === "US" ? "Market prices from thousands of US sellers" : "US marketplace · prices in US$"}
          </p>
        </div>
        <span className="rounded bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ad</span>
        <a
          href={searchHref}
          target="_blank"
          rel={outboundRel()}
          data-retailer="tcgplayer_strip"
          data-page={page}
          data-surface="tcgplayer_strip"
          className="hidden shrink-0 rounded-md bg-[#1f6fe5] px-2.5 py-1 text-xs font-bold text-white sm:inline-block"
        >
          Shop TCGplayer →
        </a>
      </div>
      <ul className="flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-3">
        {ordered.map((t) => (
          <li key={t.id} className="w-[136px] shrink-0 snap-start">
            <a
              href={affiliateUrl(productUrl(t.id), "tcgplayer_strip", `/${page}`)}
              target="_blank"
              rel={outboundRel()}
              data-retailer="tcgplayer_strip"
              data-page={page}
              data-card={t.slug}
              data-surface="tcgplayer_strip"
              className="group flex h-full flex-col overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition hover:-translate-y-0.5 hover:border-[#1f6fe5]"
            >
              <div className="relative aspect-[5/7] bg-ink-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.imageUrl} alt={t.name} loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5 transition group-hover:scale-[1.03]" />
                <span className="num absolute bottom-1.5 right-1.5 rounded-md bg-[#1f6fe5] px-1.5 py-0.5 text-xs font-black text-white shadow">
                  {usd(t.marketUsd)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-2">
                <p className="line-clamp-2 text-xs font-medium leading-tight text-white">
                  {t.name}
                  {t.variant ? <span className="font-normal text-slate-400"> · {t.variant}</span> : null}
                </p>
                <p className="mt-auto text-[11px] text-slate-400">TCGplayer market</p>
              </div>
            </a>
          </li>
        ))}
        <li className="w-[136px] shrink-0 snap-start">
          <a
            href={searchHref}
            target="_blank"
            rel={outboundRel()}
            data-retailer="tcgplayer_strip"
            data-page={page}
            data-surface="tcgplayer_strip"
            className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-600 p-3 text-center hover:border-[#1f6fe5]"
          >
            <span className="rounded-full bg-[#1f6fe5] px-3 py-1 text-xs font-bold text-white">Shop TCGplayer →</span>
            <span className="text-[11px] text-slate-400">Every listing, sorted by price</span>
          </a>
        </li>
      </ul>
      <div className="px-4 pb-3">
        <AffiliateDisclosure partner="tcgplayer" tight />
      </div>
    </section>
  );
}
