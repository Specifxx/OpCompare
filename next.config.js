/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com" }],
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
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
