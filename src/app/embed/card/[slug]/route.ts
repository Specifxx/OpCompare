import { getCatalog } from "@/lib/data";
import { COUNTRIES } from "@/lib/country";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { usdCentsToCountry } from "@/lib/fx";
import { badgeHtml, marketParam } from "@/lib/embed";

// The embeddable card price badge (DECISIONS.md, "Free price widgets", 2026-11-02). A route handler, so it escapes the
// root layout and can be framed (next.config.js frame-ancestors for /embed/:path+). Reads only the cached catalogue;
// it reads ?market, so its only cache is the CDN header (six hours fresh, a day stale, like the card pages).
export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9-]{1,160}$/;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const market = marketParam(new URL(req.url).searchParams.get("market"));
  const headers = { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" };
  const cat = SLUG.test(params.slug) ? await getCatalog().catch(() => null) : null;
  const c = cat?.bySlug.get(params.slug);
  if (!c || !cat) {
    const body = badgeHtml({ site: SITE_NAME, name: "Not found", meta: "Search every One Piece card", price: null, sub: "", href: `${SITE_URL}/?utm_source=embed`, image: null });
    return new Response(body, { status: 404, headers: { ...headers, "Cache-Control": "public, s-maxage=300" } });
  }
  const low = c.low[market];
  const stores = c.stores[market];
  const set = cat.setById.get(c.setId);
  const body = badgeHtml({
    site: SITE_NAME,
    name: c.name + (c.variant ? ` (${c.variant})` : ""),
    meta: [set?.code, c.number, c.rarity].filter(Boolean).join(" · "),
    price: low != null ? `from ${money(low, market)}` : c.marketUsd != null ? `≈ ${money(usdCentsToCountry(c.marketUsd, market), market)}` : null,
    sub: low != null ? `${stores} ${stores === 1 ? "store" : "stores"} · ${COUNTRIES[market].label}` : c.marketUsd != null ? "TCGplayer market price" : "no price yet",
    href: `${SITE_URL}/card/${c.slug}?utm_source=embed&utm_medium=widget`,
    image: c.hasImage ? cardImage.thumb(c.id) : null,
  });
  return new Response(body, { headers: { ...headers, "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}
