import { NextResponse } from "next/server";
import { getCatalog, getSealedDetail } from "@/lib/data";
import { AMAZON_CLOCK, amazonLivePrice } from "@/lib/amazon-live";
import { isCountry, type Country } from "@/lib/country";
import { money } from "@/lib/format";

// Amazon's own price of a sealed product in one market (lib/amazon-live.ts), asked by the sealed page's Amazon row
// from the browser. One Creators API search per answer; the CDN keeps it six hours (a day stale), so a product costs
// at most four calls a day per market, and nothing is stored: Amazon's licence lets a price be shown for 24 hours
// with its time, never kept. A refused store (no API access yet) is kept 6 hours too; a rate limit or error 10
// minutes. Reads only data.ts loaders for the product (a Data Cache read, never a query).
export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{1,160}$/;
const SIX_H = "public, s-maxage=21600, stale-while-revalidate=86400";
const TEN_MIN = "public, s-maxage=600, stale-while-revalidate=600";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const c = new URL(req.url).searchParams.get("c") ?? "";
  if (!SLUG.test(params.slug) || !isCountry(c)) return NextResponse.json({ status: "error" }, { status: 404 });
  const country: Country = c;
  const s = await getSealedDetail(params.slug);
  if (!s) return NextResponse.json({ status: "error" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=300" } });
  const cat = await getCatalog().catch(() => null);
  const set = s.setId != null ? cat?.setById.get(s.setId) ?? null : null;
  const a = await amazonLivePrice(
    {
      id: s.id,
      name: s.name,
      kind: s.kind,
      setCode: set?.code ?? null,
      setName: set?.name ?? null,
      storePricesCents: s.offers.filter((o) => o.market === country && o.inStock && !o.source.startsWith("ebay")).map((o) => o.priceCents),
    },
    country,
  );
  const clock = AMAZON_CLOCK[country];
  const body = a.status === "ok" ? { ...a, price: money(a.priceCents!, country), timeZone: clock?.timeZone, zoneLabel: clock?.label } : { status: a.status };
  return NextResponse.json(body, { headers: { "Cache-Control": a.status === "error" ? TEN_MIN : SIX_H } });
}
