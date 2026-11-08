import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import { FAMILY_SITES, NETWORK_PAGE } from "@/lib/family-network";
import { SITE_NAME } from "@/lib/site";
import { pageOg } from "@/lib/og/meta";

// The one page that links the owner's other sites (2026-11-08, DECISIONS.md "One Our sites page instead of
// footer cross-links"). The footer used to name the other card sites on every page: thousands of site-wide
// links between our own sites, the pattern Google's link-spam policy warns about, with no authority in it.
// Now every footer links here once, and this page links each site once, by its plain name. No database read.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Our other sites",
  description: `${SITE_NAME} is one of the Compare Empire price comparison sites. The others compare card games, hobby and tech prices the same way.`,
  alternates: { canonical: "/our-sites" },
  openGraph: pageOg("/our-sites"),
};

export default function OurSites() {
  const sites = FAMILY_SITES.filter((s) => s.id !== "op");
  return (
    <StaticPage title="Our other sites" crumb="Our other sites">
      <p>
        {SITE_NAME} is one of the Compare Empire sites: independent price comparison, the same rules on every site, no paid
        ranking.
      </p>
      <ul>
        {sites.map((s) => (
          <li key={s.id}>
            <a href={s.url} rel="noopener">
              {s.name}
            </a>
            : {s.label}
          </li>
        ))}
      </ul>
      <p>
        <a href={NETWORK_PAGE} rel="noopener">
          Every Compare Empire site →
        </a>
      </p>
    </StaticPage>
  );
}
