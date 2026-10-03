import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact & Feedback", description: "Get in touch with OP Compare.", alternates: { canonical: "/contact" } };

export default function Contact() {
  return (
    <StaticPage title="Contact & feedback" crumb="Contact">
      <p>
        Spotted a wrong price, a card matched to the wrong printing, or a store we should add? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> —
        include the card&apos;s page link and what you expected to see.
      </p>
      <h2>Stores</h2>
      <p>
        Stores on Shopify whose One Piece singles carry the card number in the title (for example “OP01-120”) can usually be added within a day. Tell us the
        store&apos;s address and the market it ships to.
      </p>
    </StaticPage>
  );
}
