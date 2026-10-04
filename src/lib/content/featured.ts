// Owner-curated reading lists: the "Editor's picks" on /blog and /guides
// (RiftCompare's lib/content/featured.ts). Curated, never "most read": nothing on
// the site counts views per article, so that label could not be kept true. Rules
// for a pick: evergreen and substantial, set-agnostic (no slug names a set), and
// published in the category its list says (tests/guides.test.ts pins it).
export const BLOG_PICKS: readonly string[] = ["are-one-piece-cards-cheaper-abroad", "most-expensive-one-piece-cards", "cheapest-one-piece-leaders"];
export const GUIDE_PICKS: readonly string[] = ["one-piece-card-rarities-explained", "where-to-buy-one-piece-cards"];
