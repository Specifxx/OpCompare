import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & Feedback",
  description: `Email OP Compare at ${CONTACT_EMAIL}: wrong prices, stores, feedback, payments.`,
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <StaticPage title="Contact & feedback" crumb="Contact">
      {/* Email, not a form (owner, 2026-11-01: "They can just email us directly"):
          the site sends no mail of its own, so a form message would only wait in
          /admin/inbox, which nobody reads. The address is the one inbox. */}
      <p>
        Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("OP Compare")}`}>
          <strong>{CONTACT_EMAIL}</strong>
        </a>
        . A person reads every message, usually within two working days.
      </p>
      <p>
        Spotted a wrong price, a card matched to the wrong printing, or a store
        we should add? Include the card&apos;s page link and what you expected
        to see.
      </p>
      <h2>Payment or account problems</h2>
      <p>
        A charge you don&apos;t recognise, or a plan that didn&apos;t switch on? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Payment or account")}`}>{CONTACT_EMAIL}</a>{" "}
        from your account&apos;s address.
      </p>
      <h2>Stores</h2>
      <p>
        Stores on Shopify or ShadowPOS whose One Piece singles carry the card number in the
        title (for example “OP01-120”) can usually be added within a day.{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Add my store")}`}>Email us</a> its
        address and the market it ships to.
      </p>
      <h2>Feedback</h2>
      <p>
        Tell us what to keep, fix or add: email{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Feedback")}`}>{CONTACT_EMAIL}</a>.
      </p>
    </StaticPage>
  );
}
