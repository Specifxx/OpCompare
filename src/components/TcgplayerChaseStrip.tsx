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
 */
export function TcgplayerChaseStrip({
  tiles,
  heading = "Chase cards on TCGplayer",
  page,
  limit = 6,
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
  return (
    <section data-ad-placement="tcgplayer-strip" className={className} aria-label={heading}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-extrabold tracking-tight text-white">
          TCG<span className="text-sky-400">player</span>
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {country === "US" ? "Ad · market prices, fast US shipping" : "Ad · US marketplace, prices in US$"}
        </span>
        <span className="text-sm font-bold text-white">{heading}</span>
        <a
          href={affiliateUrl(SEARCH, "tcgplayer_strip", `/${page}`)}
          target="_blank"
          rel={outboundRel()}
          data-retailer="tcgplayer_strip"
          data-page={page}
          data-surface="tcgplayer_strip"
          className="ml-auto text-xs font-bold text-sky-300 hover:underline"
        >
          Shop TCGplayer →
        </a>
      </div>
      <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
        {ordered.map((t) => (
          <li key={t.id} className="w-[38vw] max-w-[150px] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <a
              href={affiliateUrl(productUrl(t.id), "tcgplayer_strip", `/${page}`)}
              target="_blank"
              rel={outboundRel()}
              data-retailer="tcgplayer_strip"
              data-page={page}
              data-card={t.slug}
              data-surface="tcgplayer_strip"
              className="flex h-full flex-col rounded-lg border border-ink-700 bg-ink-900 p-2 transition-colors hover:border-sky-500/60 hover:bg-ink-800"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-ink-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.imageUrl} alt={t.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              <div className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-slate-200">
                {t.name}
                {t.variant ? <span className="font-normal text-slate-400"> · {t.variant}</span> : null}
              </div>
              <div className="num mt-auto pt-1 text-sm font-extrabold text-white">{usd(t.marketUsd)}</div>
              <div className="text-[10px] text-sky-300">TCGplayer market</div>
            </a>
          </li>
        ))}
      </ul>
      <AffiliateDisclosure partner="tcgplayer" tight />
    </section>
  );
}
