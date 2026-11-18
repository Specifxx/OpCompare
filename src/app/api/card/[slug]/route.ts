import { NextResponse } from "next/server";
import { getCardDetail, getEbayPanel, getProductHistory } from "@/lib/data";
import { quickViewPayload } from "@/lib/quick-view";
import { fetchRowsFor } from "@/lib/fetchtcg";

// The card QuickView's data (components/QuickView.tsx): one card's facts, every
// market's cheapest open rows (affiliate-tagged), its eBay searches and the
// TCGplayer reference and its last 90 days of price history, as small
// market-independent JSON. Reads only the card page's own loaders: the
// self-cached getCardDetail (a Data Cache read, never a query) and
// getProductHistory (the GitHub history file, fetch-cached; no database).
// The CDN keeps each card six hours (a day stale) and the same response serves
// every market: prices change once a day, with the snapshot (cost, 2026-11-05;
// it was ten minutes).
export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{1,160}$/;

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  if (!SLUG.test(params.slug)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const card = await getCardDetail(params.slug);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=300" } });
  const history = await getProductHistory(card.id).catch(() => []);
  const panel = await getEbayPanel(card.id).catch(() => ({ listings: [], graded: [] }));
  const payload = quickViewPayload(card, undefined, history, panel.graded, fetchRowsFor(card));
  // The quick view's eBay ad carousel (owner, 2026-11-18): the panel's own listings, at most four per market.
  const perMarket = new Map<string, number>();
  const ebayListings = [...panel.listings].sort((a, b) => a.rank - b.rank).filter((l) => {
    const n = perMarket.get(l.market) ?? 0;
    perMarket.set(l.market, n + 1);
    return n < 4;
  }).map(({ u: _u, ...l }) => l);
  return NextResponse.json(ebayListings.length ? { ...payload, ebayListings } : payload, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
  });
}
