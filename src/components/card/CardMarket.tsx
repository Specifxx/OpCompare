"use client";

// The market-dependent half of the card page, localised in the browser.
//
// The card page is REAL ISR (src/app/card/[slug]/page.tsx): no cookie, header or
// session read anywhere in its tree, so one HTML per card is rendered on the
// baseline market (DEFAULT_COUNTRY, the US) and served from the cache to every
// visitor and crawler. Everything that depends on the visitor's market is
// computed on the server for ALL six markets (lib/per-market.ts: identical
// values shared) and handed to these islands, which draw the market
// CountryProvider resolves (cookie, then /api/geo) after hydration. The server
// render and the first client render both use DEFAULT_COUNTRY, so hydration
// matches and a crawler sees complete US prices; switching market needs no
// server render. RiftCompare's CardMarketSection model.
//
// Nothing here formats an affiliate link or reads the store registry: board
// rows, eBay banner searches and buy rows arrive tagged from the server (the
// partner ids are server environment variables).
import { useMemo } from "react";
import { COUNTRIES, type Country } from "@/lib/country";
import { longDate, money } from "@/lib/format";
import { pickMarket, pickMarketList, type PerMarket, type PerMarketList } from "@/lib/per-market";
import { visitorHistory } from "@/lib/price-history-view";
import type { BoardModel } from "@/lib/board-model";
import type { CardPriceState } from "@/lib/card-price-state";
import type { HistoryPoint } from "@/lib/data";
import type { LastKnown } from "@/lib/last-known";
import type { EbayPanelData } from "@/lib/listing-panel";
import type { BuyRow } from "@/lib/quick-view";
import { Ago } from "../Ago";
import { CardMarketsTableView, type MarketsTableData } from "../CardMarketsTableView";
import { CardNoListings } from "../CardNoListings";
import { CardStickyBuyBar } from "../CardStickyBuyBar";
import { CardTopBuy } from "../CardTopBuy";
import { useCountry } from "../CountryProvider";
import { EbayCardBanner } from "../EbayCardBanner";
import { EbayCardPanelLive } from "../EbayCardPanelLive";
import { LastKnownPrice } from "../LastKnownPrice";
import { buildChartData, ChartEmpty } from "../LineChart";
import { LineChartInteractive } from "../LineChartInteractive";
import { PriceBoardView } from "../PriceBoardView";
import { PriceDropAlertCta } from "../PriceDropAlertCta";
import { TcgMarketPrice } from "../TcgMarketPrice";
import { TcgplayerBanner } from "../TcgplayerBanner";

const useMarket = (): Country => useCountry().country;

/** The header's two market tiles: "Cheapest · <place>" and "In stock at · <code>". */
export interface MarketTile {
  kind: "listing" | "reference" | "none";
  cents: number | null;
  /** The newest sold-out price we saw here, shown when there is no price at all. */
  seen: { cents: number; at: string } | null;
  /**
   * No price and no sold-out row here: the newest price this printing's history
   * holds for this market (lib/last-known.ts), drawn muted and labelled, never as
   * the cheapest. Display only: the JSON-LD, metadata and FAQ never read it.
   */
  lastKnown: LastKnown | null;
  /** Distinct stores with a copy in stock here. */
  stores: number;
  /** "3 stores in other markets". */
  elsewhere: string | null;
}

/** Two grid cells (the header's stat grid holds them beside the card's own stats). */
export function MarketTiles({ tiles, now }: { tiles: PerMarket<MarketTile>; now: number }) {
  const country = useMarket();
  const co = COUNTRIES[country];
  const t = pickMarket(tiles, country);
  // Only where the tile would say "—": no listing, no reference, no sold-out row.
  const lk = t.kind === "none" && !t.seen ? t.lastKnown : null;
  return (
    <>
      {lk ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">No live price · {co.place}</p>
          <div className="mt-1">
            <LastKnownPrice lk={lk} country={country} amountClass="text-xl font-semibold" noteClass="mt-0.5 text-[11px]" />
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cheapest · {co.place}</p>
          <p className="num mt-1 text-xl font-bold text-accent">
            {t.kind === "listing" ? money(t.cents, country) : t.kind === "reference" ? `≈ ${money(t.cents, country)}` : t.seen ? money(t.seen.cents, country) : "—"}
          </p>
          {t.kind === "none" && t.seen ? (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Last seen <Ago at={t.seen.at} now={now} />
            </p>
          ) : null}
        </div>
      )}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In stock at · {co.code}</p>
        <p className="num mt-1 text-xl font-bold text-white">
          {t.stores} {t.stores === 1 ? "store" : "stores"}
        </p>
        {t.elsewhere ? <p className="mt-0.5 text-[11px] text-slate-500">{t.elsewhere}</p> : null}
      </div>
    </>
  );
}

/** The phone buy block under the card's name: the market's cheapest open row. */
export function MarketTopBuy({ best, page, slug }: { best: PerMarket<BuyRow | null>; page: string; slug: string }) {
  const country = useMarket();
  return <CardTopBuy best={pickMarket(best, country)} country={country} page={page} slug={slug} />;
}

/** The pinned phone buy bar: the same row as MarketTopBuy. Keyed by market so it re-measures. */
export function MarketStickyBuyBar({ best, ...rest }: { best: PerMarket<BuyRow | null>; boardId: string; page: string; slug: string; name: string; cardId: number }) {
  const country = useMarket();
  const b = pickMarket(best, country);
  if (!b) return null;
  return <CardStickyBuyBar key={country} {...rest} price={money(b.priceCents, country)} store={b.label} href={b.href} retailer={b.retailer} ebay={b.ebay} />;
}

/** The alert call to action: "in stock" wording where nothing is listed in the visitor's market. */
export function MarketAlertCta({ unpriced, ...rest }: Omit<React.ComponentProps<typeof PriceDropAlertCta>, "unpriced"> & { unpriced: PerMarket<boolean> }) {
  const country = useMarket();
  return <PriceDropAlertCta {...rest} unpriced={pickMarket(unpriced, country)} />;
}

/** "No live listings for X yet" where the visitor's market (or every market) has none; null state = not shown. */
export function MarketNoListings({ states, ...rest }: Omit<React.ComponentProps<typeof CardNoListings>, "state" | "country"> & { states: PerMarket<CardPriceState | null> }) {
  const country = useMarket();
  const state = pickMarket(states, country);
  return state ? <CardNoListings {...rest} country={country} state={state} /> : null;
}

/** The price comparison for the visitor's market (every market's board is resolved on the server). */
export function MarketBoard({ boards, ...rest }: Omit<React.ComponentProps<typeof PriceBoardView>, "model" | "country"> & { boards: PerMarket<BoardModel> }) {
  const country = useMarket();
  return <PriceBoardView {...rest} model={pickMarket(boards, country)} country={country} />;
}

/** Under the board: TCGplayer's market price as a reference, the card's eBay banner and TCGplayer's. */
export function MarketReference({
  marketUsd,
  tcgHref,
  ebayBanner,
  tcgBanner,
  query,
  name,
  page,
  card,
}: {
  marketUsd: number | null;
  tcgHref: string;
  ebayBanner: PerMarket<string>;
  tcgBanner: string;
  query: string;
  name: string;
  page: string;
  card: string;
}) {
  const country = useMarket();
  return (
    <>
      <TcgMarketPrice marketUsd={marketUsd} country={country} href={tcgHref} page={page} card={card} />
      <EbayCardBanner country={country} query={query} name={name} page={page} card={card} href={pickMarket(ebayBanner, country)} />
      <TcgplayerBanner country={country} page={page} card={card} href={tcgBanner} />
    </>
  );
}

/** A day of the card's history: [day, TCGplayer market (USD cents), each market's low in MARKETS order]. */
export type HistoryTuple = [day: string, marketUsd: number | null, lows: (number | null)[]];

/** The price-history section in the visitor's market and currency (lib/price-history-view.ts). */
export function MarketHistory({ history }: { history: HistoryTuple[] }) {
  const country = useMarket();
  const co = COUNTRIES[country];
  const points = useMemo(
    (): HistoryPoint[] => history.map(([day, marketUsd, lows]) => ({ day, marketUsd, lowUsd: lows[0] ?? null, lows })),
    [history],
  );
  const vh = visitorHistory(points, country);
  const data = buildChartData(
    [
      { label: `Cheapest ${co.adjective} listing`, color: "#ff6b6b", points: vh.low.points },
      { label: "TCGplayer market (converted)", color: "#e9b73a", points: vh.market.points, dashed: true },
    ],
    (v) => money(Math.round(v), country),
  );
  return (
    <section className="card-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg text-white">{vh.title}</h2>
        <p className="text-xs text-slate-400">
          TCGplayer market shown in {vh.currency} at an indicative rate{vh.lowSince && vh.lowDays < points.length ? `; ${co.place} listing history starts ${longDate(vh.lowSince)}` : ""}
        </p>
      </div>
      {data ? (
        <LineChartInteractive key={country} data={data} />
      ) : (
        <ChartEmpty text={`Price history starts ${points[0] ? longDate(points[0].day) : "with the first import"} — the chart draws once there are two days of prices.`} />
      )}
    </section>
  );
}

/** The "About" paragraphs, which quote the visitor's market's prices. */
export function MarketParagraphs({ paras }: { paras: PerMarketList<string> }) {
  const country = useMarket();
  return (
    <>
      {pickMarketList(paras, country).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

/** The visible FAQ (its FAQPage JSON-LD is the baseline market's, the page's own). */
export function MarketFaq({ faqs }: { faqs: PerMarketList<{ q: string; a: string }> }) {
  const country = useMarket();
  return (
    <>
      {pickMarketList(faqs, country).map((f) => (
        <div key={f.q}>
          <dt className="font-semibold text-white">{f.q}</dt>
          <dd className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">{f.a}</dd>
        </div>
      ))}
    </>
  );
}

/** "<card> price by market" in the visitor's currency; nothing when fewer than two markets list it. */
export function MarketTable({ tables, name }: { tables: PerMarket<MarketsTableData | null>; name: string }) {
  const country = useMarket();
  const data = pickMarket(tables, country);
  return data ? <CardMarketsTableView data={data} name={name} country={country} /> : null;
}

/** "Also available on eBay": the captured listings and slabs on the visitor's eBay. */
export function MarketEbayPanel({
  data,
  raw,
  query,
  name,
  card,
  preRelease,
}: {
  data: EbayPanelData;
  /** Each market's cheapest raw price (the "N× raw" multiple on a slab). */
  raw: Record<Country, number | null>;
  query: string;
  name: string;
  card: string;
  preRelease: boolean;
}) {
  const country = useMarket();
  return <EbayCardPanelLive data={data} country={country} query={query} name={name} card={card} page="card" rawCents={raw[country] ?? null} showGraded preRelease={preRelease} className="mt-4" />;
}

/** The visitor's market as prose ("the United States"). */
export function MarketPlace() {
  return <>{COUNTRIES[useMarket()].place}</>;
}
