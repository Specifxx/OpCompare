// Amazon Associates links (owner, 2026-10-29: "we are now earning money through our Amazon affiliates … are we doing that? If we're
// not, we got to implement it"). One Piece sealed (booster boxes, starter decks, double packs) sells on Amazon, so the sealed pages
// carry a "Check price on Amazon" link beside eBay. Plain links, server-built:
//
// - WHERE: Amazon US (amazon.com) for US visitors, tag AMAZON_US_TAG, else AMAZON_ASSOCIATE_TAG, else riftcompare-20 (the owner's
//   US Associates account, until OP Compare has its own ID); Amazon Australia (amazon.com.au) for Australian visitors, AMAZON_AU_TAG,
//   default compareempire-22 (the owner's AU account). The UK, Canada and the EU only once AMAZON_UK_TAG / AMAZON_CA_TAG /
//   AMAZON_DE_TAG is set: no account there yet, and an untagged link earns nothing, so those markets show no Amazon at all. Never
//   Singapore (amazon.sg has no Associates programme).
// - WHAT: a search for the product (https://<host>/s?k=<name>&tag=<tag>&ascsubtag=oc-<market>-<placement>): ascsubtag splits the
//   Associates reports by placement. No redirect, no shortener (the Associates agreement requires the link to be what it says).
// - NEVER: an Amazon price, rating, stock or Prime claim (we have no Product Advertising API access), a row of the price board, the
//   cheapest, a store, an alert, a basket. "Check price on Amazon US" and Amazon's page is final.
import type { Country } from "./country";

export const AMAZON_US_DEFAULT_TAG = "riftcompare-20";
export const AMAZON_AU_DEFAULT_TAG = "compareempire-22";
/** The Associates programme's required statement, word for word, beside every Amazon link and in the footer. */
export const AMAZON_STATEMENT = "As an Amazon Associate I earn from qualifying purchases.";

interface Store {
  host: string;
  label: string;
  tagEnv: string[];
  defaultTag: string | null;
}
const STORES: Record<Country, Store | null> = {
  US: { host: "www.amazon.com", label: "Amazon US", tagEnv: ["AMAZON_US_TAG", "AMAZON_ASSOCIATE_TAG"], defaultTag: AMAZON_US_DEFAULT_TAG },
  AU: { host: "www.amazon.com.au", label: "Amazon AU", tagEnv: ["AMAZON_AU_TAG"], defaultTag: AMAZON_AU_DEFAULT_TAG },
  UK: { host: "www.amazon.co.uk", label: "Amazon UK", tagEnv: ["AMAZON_UK_TAG"], defaultTag: null },
  CA: { host: "www.amazon.ca", label: "Amazon CA", tagEnv: ["AMAZON_CA_TAG"], defaultTag: null },
  EU: { host: "www.amazon.de", label: "Amazon DE", tagEnv: ["AMAZON_DE_TAG"], defaultTag: null },
  SG: null,
};

/** A tracking ID as Amazon issues them: lowercase letters, digits and hyphens, ending -20 to -29. */
const TAG_RE = /^[a-z0-9][a-z0-9-]{1,60}-2\d$/;
type Env = Record<string, string | undefined>;

/** The market's Amazon (host, label, tag), or null where it shows none (Singapore, or no tag set). */
export function amazonFor(country: Country, env: Env = process.env): { host: string; label: string; tag: string } | null {
  const s = STORES[country];
  if (!s) return null;
  const set = s.tagEnv.map((k) => env[k]?.trim().toLowerCase()).find((t) => t && TAG_RE.test(t));
  const tag = set ?? s.defaultTag;
  return tag ? { host: s.host, label: s.label, tag } : null;
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
export function amazonSearchUrl(country: Country, name: string, placement: string, env: Env = process.env): string | null {
  const a = amazonFor(country, env);
  if (!a) return null;
  const u = new URL(`https://${a.host}/s`);
  u.searchParams.set("k", amazonQuery(name));
  u.searchParams.set("tag", a.tag);
  u.searchParams.set("ascsubtag", `oc-${country.toLowerCase()}-${placement}`.replace(/[^a-z0-9_-]+/g, "-"));
  return u.toString();
}

/** Exactly what the Associates programme expects of a link: sponsored and nofollow, a new tab, no noreferrer (Amazon sees our site). */
export const AMAZON_REL = "sponsored nofollow noopener";
