import { NextResponse } from "next/server";
import { getCardDetail, getChaseStrip, getEbayPanel, getProductHistory } from "@/lib/data";
import { quickViewPayload } from "@/lib/quick-view";

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
  const chase = (await getChaseStrip().catch(() => [])).filter((t) => t.id !== card.id);
  return NextResponse.json({ ...quickViewPayload(card, undefined, history, panel.graded), chase }, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
  });
}
