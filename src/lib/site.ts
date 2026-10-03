// Site identity. Everything brand-shaped reads from here, so a rename or a new
// domain is a one-file change.
//
// SITE_URL is env-overridable because the production domain is the owner's
// call: set NEXT_PUBLIC_SITE_URL in Vercel once the domain is attached. It is
// used for canonical URLs, the sitemap, Open Graph and JSON-LD.
export const SITE_NAME = "OP Compare";
export const SITE_SHORT = "OPCompare";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://opcompare.com").replace(/\/+$/, "");
export const SITE_TAGLINE = "One Piece Card Game prices, compared";
export const SITE_DESCRIPTION =
  "Compare One Piece Card Game prices across stores in the US, Australia, the UK, Singapore, Canada and the EU. Every card, every parallel and every sealed product, priced daily.";
// The public contact address. Env-overridable; the fallback is the owner's
// existing public site address so mail is never sent to a box nobody reads.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "riftcompare@gmail.com";
// The owner's sister site for Riftbound, linked from About and the footer.
export const SISTER_SITE = { name: "RiftCompare", url: "https://riftcompare.com", game: "Riftbound" };
