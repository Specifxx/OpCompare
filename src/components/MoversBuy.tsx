"use client";

// Buy on /movers (buy-clicks boardroom, 2026-11-20, move 2). Reddit link posts land on /movers and those visitors
// almost never clicked buy (0.7–3% against 12–23% from Google). Each row says what the card costs NOW in the visitor's
// market (CardLite.low, the cheapest in-stock store price the tiles show; TCGplayer's market price where no store has
// it) and carries a Buy pill; the row is already a CardQuickLink, so a tap opens the quick view, eBay and TCGplayer
// first. The strip puts the week's top three risers in the first screen. Both read the catalogue the page already
// loaded: no new read, and the page's cache is unchanged. The display-only last price is never read here.
import type { Country } from "@/lib/country";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { useCountryMaybe } from "./CountryProvider";
import CardQuickLink from "./CardQuickLink";

export interface BuyCard {
  id: number;
  slug: string;
  name: string;
  variant: string | null;
  sub: string;
  hasImage: boolean;
  marketUsd: number | null;
  low: Record<Country, number | null>;
}

function useNow(c: Pick<BuyCard, "low" | "marketUsd">): { text: string; where: string } | null {
  const country = useCountryMaybe()?.country ?? "US";
  const local = c.low[country];
  if (local != null) return { text: money(local, country), where: "cheapest now" };
  if (c.marketUsd != null) return { text: money(c.marketUsd, "US"), where: "TCGplayer" };
  return null;
}

/** The row's price column: today's cheapest in the visitor's market, the move, and a Buy pill. */
export function CheapestNow({ low, marketUsd, children }: { low: BuyCard["low"]; marketUsd: number | null; children?: React.ReactNode }) {
  const now = useNow({ low, marketUsd });
  return (
    <span className="flex shrink-0 flex-col items-end">
      <span className="num text-sm font-semibold text-accent" title={now?.where}>{now?.text ?? "—"}</span>
      {children}
      <span data-movers-buy="" className="btn-buy mt-1 inline-flex min-h-0 px-3 py-0.5 text-[11px]">
        Buy
      </span>
    </span>
  );
}

function ShopRow({ c }: { c: BuyCard }) {
  const now = useNow(c);
  return (
    <li>
      <CardQuickLink slug={c.slug} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800/50">
        {c.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cardImage.thumb(c.id)} alt={c.name} loading="lazy" width={32} height={44} className="h-11 w-8 shrink-0 rounded-sm bg-ink-800 object-cover" />
        ) : (
          <span className="h-11 w-8 shrink-0 rounded-sm bg-ink-800" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span data-card-name className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
            {c.name}
            {c.variant ? ` (${c.variant})` : ""}
          </span>
          <span className="num block text-xs text-slate-400">
            {now ? (
              <>
                <b className="text-base text-white">{now.text}</b> {now.where}
              </>
            ) : (
              "Check eBay and TCGplayer"
            )}
          </span>
        </span>
        <span className="btn-buy min-h-10 shrink-0 whitespace-nowrap px-4 text-sm">Buy</span>
      </CardQuickLink>
    </li>
  );
}

/** "Shop the top risers": the week's top three risers, first screen. */
export function RisersShop({ cards }: { cards: BuyCard[] }) {
  if (!cards.length) return null;
  return (
    <section className="card-surface mt-4 max-w-2xl overflow-hidden" aria-labelledby="shop-risers" data-risers-shop>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-800 px-4 py-2.5">
        <h2 id="shop-risers" className="text-base font-bold text-white">Shop the top risers</h2>
        <span className="text-xs text-slate-400">Cheapest price now in your market</span>
      </div>
      <ul className="divide-y divide-ink-800">
        {cards.map((c) => (
          <ShopRow key={c.id} c={c} />
        ))}
      </ul>
    </section>
  );
}
