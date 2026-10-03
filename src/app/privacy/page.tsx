import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <StaticPage title="Privacy policy" crumb="Privacy">
      <p>{SITE_NAME} has no accounts and collects no personal details. This page lists everything the site stores or shares.</p>
      <h2>Stored in your browser</h2>
      <ul>
        <li>
          <strong>country</strong> cookie — the market you chose, so prices show in your currency (1 year).
        </li>
        <li>
          <strong>Local storage</strong> — your theme, the side menu&apos;s open sections and your watchlist. It never leaves your device except as the list of
          cards your watchlist page asks prices for.
        </li>
      </ul>
      <h2>Analytics</h2>
      <p>Vercel Web Analytics counts page views without cookies and without identifying you.</p>
      <h2>Your location</h2>
      <p>On a first visit, your country is read from the request&apos;s IP-based location header to pick a market. It is not stored.</p>
      <h2>Links to stores</h2>
      <p>
        When you follow a link to a store, eBay or TCGplayer, that site&apos;s own privacy policy applies. eBay and TCGplayer links carry an affiliate tag
        identifying {SITE_NAME}, not you.
      </p>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </StaticPage>
  );
}
