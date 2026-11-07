import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Personal pages (/watching, /dashboard, /profile and the /watchlist and
// /account redirects) are NOT disallowed: each carries a noindex meta, which a
// Disallow would hide from Google (RiftCompare, wave 2).
//
// RiftCompare's crawl rules (2026-10-16, ported 2026-10-27): bulk scrapers that
// neither cite back nor feed a search or answer index are blocked (AhrefsBot,
// SemrushBot, the AI answer engines and Common Crawl stay allowed), and
// query-string URLs are not crawled. No sitemap URL carries a query and every
// page that reads one canonicalises to its clean URL, so ?sort= / ?page= / ?utm_
// variants only buy renders; every card is in the sitemap. The longest matching
// rule wins, so each Allow (Next's assets, share images, icons) beats "/*?".
const BLOCKED_BOTS = [
  "Bytespider", "meta-externalagent", "Meta-ExternalAgent",
  "MJ12bot", "DotBot", "PetalBot", "DataForSeoBot", "BLEXBot", "Barkrowler", "serpstatbot", "SeekportBot", "ImagesiftBot", "Timpibot",
];
// A shared link (utm_source=share, lib/share-link.ts) too: X and Reddit fetch its preview and obey robots.txt.
// Clean pagination is crawlable (SEO audit, 2026-11-07): with "/*?" blocking it, a deep card's only path was the
// sitemap. Page 2+ of these lists is self-canonical (browse, sets, colours, keywords, traits) or noindex, follow
// (the price guide); any other query stays blocked, and "?page=2&sort=…" still matches only the clean prefix.
const PAGINATION_ALLOWS = ["/browse?page=", "/sets/*?page=", "/colors/*?page=", "/keywords/*?page=", "/cards/trait/*?page=", "/price-guide?page="];
const QUERY_ALLOWS = ["/_next/", "/*opengraph-image", "/*twitter-image", "/icon", "/apple-icon", "/*utm_source=share", ...PAGINATION_ALLOWS];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", ...QUERY_ALLOWS], disallow: ["/api/", "/admin", "/login", "/premium/welcome", "/*?"] },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
