import { AdSenseLoader } from "@/components/AdSenseLoader";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { FooterAds } from "@/components/AffiliateAds";
import { CountryProvider } from "@/components/CountryProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import QuickViewProvider from "@/components/QuickViewProvider";
import { SealedQuickViewProvider } from "@/components/SealedQuickView";
import { SideNav } from "@/components/SideNav";
import { PlanProvider } from "@/components/PlanProvider";
import { OutboundBeacon } from "@/components/OutboundBeacon";
import { PremiumSlideIn } from "@/components/PremiumSlideIn";
import { AnnualSwitchNudge } from "@/components/AnnualSwitchNudge";
import { stripeEnabled } from "@/lib/stripe";
import { getCountry } from "@/lib/get-country";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-shared";
import { OG_BASE } from "@/lib/og/meta";
import { AD_FREE_BOOT_SCRIPT } from "@/lib/ad-free";

// RiftCompare's font block, verbatim (wave 2, 2026-10-03; owner: "the font and
// everything needs to be the same"). Headings — Fraunces: a sharp,
// high-contrast, slightly flared serif at a heavy weight. Body/UI — Inter.
// Prices — JetBrains Mono. Exposed as CSS vars on <html>, wired into Tailwind.
// display: "swap" — the brand fonts ALWAYS render rather than "optional", which
// silently keeps the system fallback whenever the font misses the ~100ms
// first-paint window; adjustFontFallback size-matches the fallback so the
// swap-in causes negligible layout shift. The homepage alone adds Archivo as
// --font-riftbound (its `.rb-display-sans` wrapper, globals.css).
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// preload: false — the mono face only dresses numbers, never the H1 that is the
// LCP, so it arrives with the stylesheet and swaps in. Inter (body) and
// Fraunces (the H1) stay preloaded.
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal"],
  variable: "--font-display",
  display: "swap",
});

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

// Brand chrome colour for the browser UI / installed-PWA theme: the light
// palette's page colour (THEME_COLOR.light), since light is OP Compare's
// default (DECISIONS "Light theme is the default"). ThemeToggle re-stamps the
// meta for a dark-theme visitor.
export const viewport: Viewport = { themeColor: "#f4f6f8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const country = getCountry();
  return (
    <html lang="en" data-theme="light" className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: AD_FREE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-ink-950">
        {/* Skip link: lets keyboard/AT users bypass the navbar and jump straight
            to content. Visually hidden until focused (WCAG 2.4.1 Level A). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-400 focus:ring-2 focus:ring-brand-400"
        >
          Skip to main content
        </a>
        {/* Route-change progress bar: the dark brand-400 red, 2px, no spinner.
            zIndex 200 matches the skip link — it wins over every overlay. */}
        <NextTopLoader color="#ff6b6b" height={2} showSpinner={false} shadow={false} zIndex={200} />
        <CountryProvider initial={country}>
          {/* Card QuickView (CardQuickLink): a client island; reads no session. */}
          <QuickViewProvider>
          <SealedQuickViewProvider>
          {/* The Plus/Premium dialog, the click beacon and the corner nudges.
              checkoutOpen is an environment read (is Stripe configured?), not
              a session read: who the visitor is comes from /api/me, client-side. */}
          <PlanProvider checkoutOpen={stripeEnabled()}>
          <OutboundBeacon />
          <SideNav />
          <Navbar />
          {/* RiftCompare's shell: the rail reservation on an OUTER wrapper, the
              content container on <main> (a pl-* and container-app's px-* on
              one element fight over padding-left). Pages never add their own
              outer container-app or py-*. */}
          <div className="pl-[var(--sidenav-w)]">
            <main id="main-content" className="container-app min-w-0 py-6">
              {children}
            </main>
          </div>
          {/* The ad zone needs the same rail reservation as <main>. */}
          <div className="pl-[var(--sidenav-w)]">
            <FooterAds />
          </div>
          <Footer />
          <PremiumSlideIn />
          <AnnualSwitchNudge />
          </PlanProvider>
          </SealedQuickViewProvider>
          </QuickViewProvider>
        </CountryProvider>
        <AdSenseLoader />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
