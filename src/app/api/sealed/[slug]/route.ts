import { NextResponse } from "next/server";
import { getCatalog, getProductHistory, getSealedDetail } from "@/lib/data";
import { quickViewHistory } from "@/lib/quick-view";
import { sealedQuickViewPayload } from "@/lib/sealed-quick-view";

// The sealed QuickView's data: one product's facts and every market's offers
// (affiliate-tagged), market-independent so one CDN entry serves every visitor,
// six hours and a day stale (cost, 2026-11-05; the offers change once a day).
// Reads only data.ts loaders (a Data Cache read, never a query).
export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{1,160}$/;

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  if (!SLUG.test(params.slug)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const s = await getSealedDetail(params.slug);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=300" } });
  const cat = await getCatalog().catch(() => null);
  const set = s.setId != null ? cat?.setById.get(s.setId) ?? null : null;
  // The price history chart in the panel (2026-11-17): the sealed page's own series, last 90 days; a failed read is no chart, not an error.
  const history = quickViewHistory(await getProductHistory(s.id).catch(() => []), new Date().toISOString().slice(0, 10));
  return NextResponse.json({ ...sealedQuickViewPayload(s, set ? { code: set.code, name: set.name, slug: set.slug } : null), history }, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
  });
}
