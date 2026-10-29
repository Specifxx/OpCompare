import { NextResponse } from "next/server";
import { getChaseStrip } from "@/lib/data";

// The chase cards for the small eBay + TCGplayer pair (MiniChaseAds) above the
// footer on pages without strips of their own (owner, 2026-10-29: the ads on
// every page). One cached loader (a Data Cache read, never a query), the same
// JSON for every visitor, kept by the CDN for six hours: a client fetch rather
// than a read in the root layout, which would pull every page's cache life
// down to the loader's.
export const dynamic = "force-dynamic";

export async function GET() {
  const tiles = await getChaseStrip().catch(() => []);
  return NextResponse.json(tiles, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
  });
}
