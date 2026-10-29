"use client";

import { affiliateUrl, cardEbayQuery, ebayAffiliateUrl, ebaySearchUrl, onePieceEbayQuery, outboundRel } from "@/lib/affiliate";
import { usd } from "@/lib/format";
import type { ChaseTile } from "@/lib/listing-panel";
import { EbayWordmark } from "./AffiliateAds";
import { useCountry } from "./CountryProvider";

const symbolFor = (cur: string) => ({ USD: "US$", AUD: "A$", GBP: "£", SGD: "S$", CAD: "C$", EUR: "€" } as Record<string, string>)[cur] ?? `${cur} `;
const fmt = (cents: number, cur: string) => `${symbolFor(cur)}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tcgProduct = (id: number) => `https://www.tcgplayer.com/product/${id}`;
const TCG_SEARCH = "https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&view=grid";

type Mini = { key: string | number; href: string; image: string; name: string; price: string | null; retailer: string; card: string };

function Row({ brand, all, accent, tiles, page }: { brand: React.ReactNode; all: { href: string; retailer: string }; accent: string; tiles: Mini[]; page: string }) {
  return (
    <div className="flex items-stretch gap-2">
      <a href={all.href} target="_blank" rel={outboundRel()} data-retailer={all.retailer} data-page={page} data-surface="mini_chase" className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 text-center">
        {brand}
        <span className="text-[10px] font-bold" style={{ color: accent }}>All →</span>
      </a>
      <div className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto pb-1">
        {tiles.map((t) => (
          <a
            key={t.key}
            href={t.href}
            target="_blank"
            rel={outboundRel()}
            data-retailer={t.retailer}
            data-page={page}
            data-card={t.card}
            data-surface="mini_chase"
            title={t.price ? `${t.name} · ${t.price}` : t.name}
            aria-label={t.price ? `${t.name}, ${t.price}` : t.name}
            className="flex w-[56px] shrink-0 snap-start flex-col overflow-hidden rounded-md border border-ink-700 bg-ink-900 transition-colors hover:border-[var(--ad-accent)]"
            style={{ ["--ad-accent" as string]: accent }}
          >
            <span className="relative block aspect-[5/7] overflow-hidden bg-ink-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-0.5" />
            </span>
            <span className="num truncate px-0.5 py-0.5 text-center text-[10px] font-black text-white" style={{ background: accent }}>
              {t.price ?? "Search"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * The small eBay + TCGplayer pair (owner, 2026-10-29: "much smaller … near the
 * top … not intrusive"): the same chase cards as the full strips, as 56px
 * tiles in one slim box, for the top of card and sealed pages, the quick views
 * and the pages without strips of their own. Labelled "Ad", hidden for
 * ad-free members (data-ad-placement), the disclosure inside the box. Clicks
 * report as `*_mini` retailers so this placement is measured apart.
 */
export function MiniChaseAds({ tiles, page, limit = 10, className = "" }: { tiles: ChaseTile[]; page: string; limit?: number; className?: string }) {
  const { country } = useCountry();
  const byValue = [...tiles].sort((a, b) => b.marketUsd - a.marketUsd);
  const ebay: Mini[] = [...byValue]
    .sort((a, b) => Number(!!b.listings[country]) - Number(!!a.listings[country]))
    .slice(0, limit)
    .map((t) => {
      const live = t.listings[country];
      return {
        key: t.id,
        href: live ? ebayAffiliateUrl(live.url, "chase-mini") : ebaySearchUrl(country, cardEbayQuery(t), "chase-mini"),
        image: live?.imageUrl || t.imageUrl,
        name: t.name,
        price: live ? fmt(live.priceCents, live.currency) : null,
        retailer: live ? "ebay_chase_mini" : "ebay_chase_search_mini",
        card: t.slug,
      };
    });
  const tcg: Mini[] = byValue
    .filter((t) => t.marketUsd > 0)
    .slice(0, limit)
    .map((t) => ({ key: t.id, href: affiliateUrl(tcgProduct(t.id), "tcgplayer_mini", `/${page}`), image: t.imageUrl, name: t.name, price: usd(t.marketUsd), retailer: "tcgplayer_strip_mini", card: t.slug }));
  if (ebay.length < 3 && tcg.length < 3) return null;
  return (
    <aside data-ad-placement="mini-chase" aria-label="Sponsored: chase cards on eBay and TCGplayer" className={`grid gap-2 rounded-lg border border-ink-700 bg-ink-900/60 p-2 lg:grid-cols-2 ${className}`}>
      {ebay.length >= 3 && (
        <Row brand={<EbayWordmark className="!text-base" />} accent="#0064d2" tiles={ebay} page={page} all={{ href: ebaySearchUrl(country, onePieceEbayQuery("chase card"), "chase-mini"), retailer: "ebay_chase_search_mini" }} />
      )}
      {tcg.length >= 3 && (
        <Row
          brand={
            <span className="text-[11px] font-black tracking-tight" aria-label="TCGplayer">
              <span className="text-white">TCG</span>
              <span className="text-sky-400">player</span>
            </span>
          }
          accent="#1f6fe5"
          tiles={tcg}
          page={page}
          all={{ href: affiliateUrl(TCG_SEARCH, "tcgplayer_mini", `/${page}`), retailer: "tcgplayer_strip_mini" }}
        />
      )}
      <p className="flex items-center gap-2 text-[10px] leading-tight text-slate-400 lg:col-span-2">
        <span className="rounded bg-ink-950/70 px-1.5 py-0.5 font-semibold uppercase tracking-wide">Ad</span>
        <span>Affiliate links: OP Compare earns from qualifying eBay and TCGplayer purchases, at no extra cost to you.{country !== "US" ? " TCGplayer prices in US$." : ""}</span>
      </p>
    </aside>
  );
}
