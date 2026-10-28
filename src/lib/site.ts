// Site identity. Everything brand-shaped reads from here, so a rename or a new
// domain is a one-file change.
//
// The production domain is opcompare.app (a .app domain: HTTPS-only, it is on
// the HSTS preload list). It is the default so a missing env var can never
// publish canonical URLs, the sitemap, Open Graph or JSON-LD on another host;
// NEXT_PUBLIC_SITE_URL overrides it (local development, a preview domain).
export const SITE_NAME = "OP Compare";
export const SITE_SHORT = "OPCompare";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://opcompare.app").replace(/\/+$/, "");
export const SITE_TAGLINE = "One Piece Card Game prices, compared";
export const SITE_DESCRIPTION =
  "Compare One Piece Card Game prices across stores in the US, Australia, the UK, Singapore, Canada and the EU. Every card, every parallel and every sealed product, priced daily.";
// The public contact address (OP Compare's own inbox). Env-overridable.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "opcompareofficial@gmail.com";
// The owner's other price-comparison sites, one per game, cross-linked from every
// footer (and named on About and Who writes this). RiftCompare is the site OP
// Compare is built on. Plain followed links: they are our own sites, never
// affiliate or sponsored (tests/site-chrome.test.ts pins the footer).
export interface SisterSite {
  key: "rift" | "dex" | "mtg" | "gundam" | "lorcana" | "ygo" | "cam" | "empire";
  name: string;
  url: string;
  game: string;
  /** What it compares, a few words after "for": "<name> for <compares>". */
  compares: string;
  /** Not a card game: the footer and Authors list it, "Compare other TCGs" does not. */
  notTcg?: boolean;
  /** The site's own search for a query, `{q}` replaced by it (its SearchAction
   *  target). Card games only: the "Searching another game?" line under /browse
   *  results (components/FamilySearch.tsx). */
  search?: string;
}
export const SISTER_SITES: readonly SisterSite[] = [
  { key: "rift", name: "RiftCompare", url: "https://riftcompare.com", game: "Riftbound", compares: "Riftbound card prices", search: "https://riftcompare.com/browse?q={q}" },
  { key: "dex", name: "DexCompare", url: "https://www.dexcompare.app", game: "Pokémon TCG", compares: "Pokémon TCG booster boxes, ETBs and bundles", search: "https://www.dexcompare.app/us/sealed?q={q}" },
  { key: "mtg", name: "MTG Compare", url: "https://mtgcompare.app", game: "Magic: The Gathering", compares: "Magic: The Gathering sealed prices", search: "https://mtgcompare.app/us/sealed?q={q}" },
  // The whole family (2026-10-26, DECISIONS.md "One family of sites").
  { key: "gundam", name: "Gundam Compare", url: "https://gundamcompare.com", game: "Gundam Card Game", compares: "Gundam Card Game prices", search: "https://gundamcompare.com/cards?q={q}" },
  { key: "lorcana", name: "Lorcana Compare", url: "https://lorcanacompare.com", game: "Disney Lorcana", compares: "Disney Lorcana card prices", search: "https://lorcanacompare.com/cards?q={q}" },
  // Every site links the whole family (2026-10-27, DECISIONS.md): YGO Compare,
  // then the two that are not card games.
  { key: "ygo", name: "YGO Compare", url: "https://ygocompare.com", game: "Yu-Gi-Oh!", compares: "Yu-Gi-Oh! card prices", search: "https://ygocompare.com/cards?q={q}" },
  { key: "cam", name: "CamCompare", url: "https://www.camcompare.app", game: "cameras", compares: "camera and lens prices", notTcg: true },
  { key: "empire", name: "Compare Empire", url: "https://www.compareempire.com", game: "tech", compares: "Australian tech prices", notTcg: true },
];
/** The card-game sites only, for "Compare other TCGs" and the one-per-game line on About. */
export const TCG_SISTER_SITES = SISTER_SITES.filter((s) => !s.notTcg);
/** Each card-game sister site's search for `q`, for the "Searching another
 *  game?" line. A plain link per site: nothing is fetched from them. */
export function familySearchLinks(q: string): { key: SisterSite["key"]; name: string; game: string; href: string }[] {
  const term = q.trim().slice(0, 80);
  if (!term) return [];
  return TCG_SISTER_SITES.filter((s) => s.search).map((s) => ({ key: s.key, name: s.name, game: s.game, href: s.search!.replace("{q}", encodeURIComponent(term)) }));
}
// OP Compare's Discord invite. Unset by default: the header icon, the footer
// link and the nav entry render only when NEXT_PUBLIC_DISCORD_URL is set, so
// there is never a dead invite on the page.
export const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || "";
