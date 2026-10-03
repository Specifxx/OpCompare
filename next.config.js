/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com" }],
  },
  experimental: {
    // Share images read their brand fonts from src/lib/og/fonts at runtime
    // (lib/og/fonts.ts); trace them into every opengraph-image function. The
    // key is matched against the route (e.g. /card/[slug]/opengraph-image).
    outputFileTracingIncludes: { "opengraph-image": ["./src/lib/og/fonts/*.ttf"] },
  },
  // www.opcompare.app → opcompare.app, whatever the Vercel domain settings say,
  // so search engines only ever see the apex host the canonical URLs name.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.opcompare.app" }],
        destination: "https://opcompare.app/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // The admin area answers outsiders with a 404, and is noindex besides.
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // Share PNGs are not pages: keep them out of search results.
      { source: "/opengraph-image:suffix(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/:path*/opengraph-image:suffix(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

module.exports = nextConfig;
