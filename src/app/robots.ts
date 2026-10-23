import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Personal pages (/watching, /dashboard, /profile and the /watchlist and
// /account redirects) are NOT disallowed: each carries a noindex meta, which a
// Disallow would hide from Google (RiftCompare, wave 2).
const PRIVATE = ["/api/", "/admin", "/login", "/premium/welcome"];

// Crawl cost (DECISIONS.md, "robots.txt: search engines in, bulk scrapers out",
// 2026-10-23). Every crawler hit on a card, set or sealed page is a render on
// Vercel. Search engines and answer engines keep full access, with no delay; the
// SEO-tool crawlers and bulk-dataset scrapers that send no visitors are
// disallowed; everyone else is asked to wait 10 s between requests. A crawler
// obeys only the most specific group naming it, so each group repeats PRIVATE.
const SEARCH = ["Googlebot", "Googlebot-Image", "Googlebot-News", "Bingbot", "DuckDuckBot", "Applebot", "YandexBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "GPTBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended"];
const BLOCKED = ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "DataForSeoBot", "BLEXBot", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SEARCH, allow: "/", disallow: PRIVATE },
      { userAgent: BLOCKED, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: PRIVATE, crawlDelay: 10 },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
