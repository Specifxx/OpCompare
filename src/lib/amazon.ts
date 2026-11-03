// Amazon Associates links (owner, 2026-10-29: "we are now earning money through our Amazon affiliates … are we doing that? If we're
// not, we got to implement it"). One Piece sealed (booster boxes, starter decks, double packs) sells on Amazon, so the sealed pages
// carry a "Check price on Amazon" link beside eBay. Plain links, server-built:
//
// - WHERE: each market's own Amazon with that store's tag, hard-coded (owner, 2026-11-02: no Vercel variable decides a tag): US
//   riftcompare-20, Australia opcompare-22, UK compareempi03-21, Canada compareempire-20, the eurozone amazon.de
//   compareempire-21. Never Singapore (amazon.sg has no Associates programme).
// - WHAT: a search for the product (https://<host>/s?k=<name>&tag=<tag>&ascsubtag=oc-<market>-<placement>): ascsubtag splits the
//   Associates reports by placement. No redirect, no shortener (the Associates agreement requires the link to be what it says).
// - NEVER: an Amazon price, rating, stock or Prime claim (we have no Product Advertising API access), a row of the price board, the
//   cheapest, a store, an alert, a basket. "Check price on Amazon US" and Amazon's page is final.
import type { Country } from "./country";

export const AMAZON_US_DEFAULT_TAG = "riftcompare-20";
export const AMAZON_AU_DEFAULT_TAG = "opcompare-22";
// The owner's UK, Canada and Germany Associates accounts (2026-11-02).
export const AMAZON_UK_DEFAULT_TAG = "compareempi03-21";
export const AMAZON_CA_DEFAULT_TAG = "compareempire-20";
export const AMAZON_DE_DEFAULT_TAG = "compareempire-21";
/** The Associates programme's required statement, word for word, beside every Amazon link and in the footer. */
export const AMAZON_STATEMENT = "As an Amazon Associate I earn from qualifying purchases.";
/** Amazon's trademark notice (Operating Agreement Dos and Don'ts, 2026-11-02): in the footer and beside the Amazon link. */
export const AMAZON_TRADEMARK = "Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates.";

interface Store {
  host: string;
  label: string;
  tag: string;
}
const STORES: Record<Country, Store | null> = {
  US: { host: "www.amazon.com", label: "Amazon US", tag: AMAZON_US_DEFAULT_TAG },
  AU: { host: "www.amazon.com.au", label: "Amazon AU", tag: AMAZON_AU_DEFAULT_TAG },
  UK: { host: "www.amazon.co.uk", label: "Amazon UK", tag: AMAZON_UK_DEFAULT_TAG },
  CA: { host: "www.amazon.ca", label: "Amazon CA", tag: AMAZON_CA_DEFAULT_TAG },
  EU: { host: "www.amazon.de", label: "Amazon DE", tag: AMAZON_DE_DEFAULT_TAG },
  SG: null,
};

/** The market's Amazon (host, label, tag), or null where it shows none (Singapore). */
export function amazonFor(country: Country): { host: string; label: string; tag: string } | null {
  const s = STORES[country];
  return s ? { host: s.host, label: s.label, tag: s.tag } : null;
}

/** What to search Amazon for: the product's name, "One Piece Card Game" once, store notes out. */
export function amazonQuery(name: string): string {
  const q = name
    .replace(/\[[^\]]*\]|\([^)]*\b(?:limit|pickup|pre-?order)\b[^)]*\)/gi, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /\bone piece\b/i.test(q) ? q : `One Piece Card Game ${q}`;
}

/** The market's Amazon search for a product, tagged, with ascsubtag oc-<market>-<placement>; null where the market shows no Amazon. */
export function amazonSearchUrl(country: Country, name: string, placement: string): string | null {
  const a = amazonFor(country);
  if (!a) return null;
  const u = new URL(`https://${a.host}/s`);
  u.searchParams.set("k", amazonQuery(name));
  u.searchParams.set("tag", a.tag);
  u.searchParams.set("ascsubtag", `oc-${country.toLowerCase()}-${placement}`.replace(/[^a-z0-9_-]+/g, "-"));
  return u.toString();
}

/** Exactly what the Associates programme expects of a link: sponsored and nofollow, a new tab, no noreferrer (Amazon sees our site). */
export const AMAZON_REL = "sponsored nofollow noopener";
