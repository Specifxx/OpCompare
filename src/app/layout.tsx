import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono, Luckiest_Guy } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { CountryProvider } from "@/components/CountryProvider";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SideNav } from "@/components/SideNav";
import { getCountry } from "@/lib/get-country";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

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
  openGraph: { siteName: SITE_NAME, type: "website", url: SITE_URL, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
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
          <SideNav />
          <Navbar />
          <main id="main" style={{ paddingLeft: "var(--sidenav-w)" }}>
            {children}
          </main>
          <Footer />
        </CountryProvider>
        <Analytics />
      </body>
    </html>
  );
}
