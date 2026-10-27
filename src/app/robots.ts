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
const QUERY_ALLOWS = ["/_next/", "/*opengraph-image", "/*twitter-image", "/icon", "/apple-icon"];

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
