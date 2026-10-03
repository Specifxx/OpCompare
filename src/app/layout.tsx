import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono, Luckiest_Guy } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { FooterAds } from "@/components/AffiliateAds";
import { CountryProvider } from "@/components/CountryProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SideNav } from "@/components/SideNav";
import { PlanProvider } from "@/components/PlanProvider";
import { OutboundBeacon } from "@/components/OutboundBeacon";
import { PremiumSlideIn } from "@/components/PremiumSlideIn";
import { AnnualSwitchNudge } from "@/components/AnnualSwitchNudge";
import { stripeEnabled } from "@/lib/stripe";
import { getCountry } from "@/lib/get-country";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { OG_BASE } from "@/lib/og/meta";
import { AD_FREE_BOOT_SCRIPT } from "@/lib/ad-free";

// Inter for UI, JetBrains Mono for prices (RiftCompare's pairing), Archivo at
// 800-900 for headings and Luckiest Guy for the hero headline — the bold,
// rounded adventure-comic voice of One Piece, used sparingly.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["700", "800", "900"] });
const brand = Luckiest_Guy({ subsets: ["latin"], variable: "--font-brand", display: "swap", weight: "400", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `One Piece Card Prices — Compare Every Store | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // No og:url here: every page inherits this object, so a url would point each
  // share at the homepage. The image is src/app/opengraph-image.tsx (the price
  // guide); twitter:image copies it, so there is no twitter-image file.
  openGraph: { ...OG_BASE },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  // Search Console's "HTML tag" verification and Bing Webmaster Tools'. Each
  // renders only when its variable is set in Vercel (a placeholder would just
  // fail verification).
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070c16" },
    { media: "(prefers-color-scheme: light)", color: "#f7f3eb" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const country = getCountry();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: AD_FREE_BOOT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} ${archivo.variable} ${brand.variable} min-h-screen`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-modal focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-400"
        >
          Skip to content
        </a>
        <NextTopLoader color="#d92b33" height={2} showSpinner={false} />
        <CountryProvider initial={country}>
          {/* The Plus/Premium dialog, the click beacon and the corner nudges.
              checkoutOpen is an environment read (is Stripe configured?), not
              a session read: who the visitor is comes from /api/me, client-side. */}
          <PlanProvider checkoutOpen={stripeEnabled()}>
          <OutboundBeacon />
          <SideNav />
          <Navbar />
          <main id="main" style={{ paddingLeft: "var(--sidenav-w)" }}>
            {children}
            <FooterAds />
          </main>
          <Footer />
          <PremiumSlideIn />
          <AnnualSwitchNudge />
          </PlanProvider>
        </CountryProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
