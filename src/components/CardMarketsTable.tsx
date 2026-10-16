import { COUNTRIES, type Country } from "@/lib/country";
import type { OfferRow } from "@/lib/data";
import { compareMarkets, marketSpreadSentence } from "@/lib/market-comparison";
import { CardMarketsTableView, type MarketsTableData } from "./CardMarketsTableView";

// "<card> price by market": every market's cheapest open listing on one scale
// (RiftCompare's CardMarketsTable), in the viewer's currency. The comparison is
// computed here, on the server; CardMarketsTableView draws it. The sealed page
// renders this per request for the visitor's market; the ISR card page builds
// marketsTableData() for every market and lets a client island pick.
export function marketsTableData(offers: OfferRow[], name: string, country: Country): MarketsTableData | null {
  const cmp = compareMarkets(offers, COUNTRIES[country].currency);
  // One market with a listing is not a comparison.
  if (cmp.quotes.length < 2) return null;
  return {
    quotes: cmp.quotes.map(({ country: c, label, flag, currency, nativeCents, shippingCents, shipsFromUs, comparableCents, storeCount }) => ({
      country: c, label, flag, currency, nativeCents, shippingCents, shipsFromUs, comparableCents, storeCount,
    })),
    compareCurrency: cmp.compareCurrency,
    cheapest: cmp.cheapest?.country ?? null,
    summary: marketSpreadSentence(cmp, name),
  };
}

export function CardMarketsTable({ offers, name, country, noun = "price by market" }: { offers: OfferRow[]; name: string; country: Country; noun?: string }) {
  const data = marketsTableData(offers, name, country);
  return data ? <CardMarketsTableView data={data} name={name} country={country} noun={noun} /> : null;
}
