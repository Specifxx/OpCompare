import { setConcentration } from "./posts/set-concentration";
import { budgetAltArts } from "./posts/budget-alt-arts";
import { boosterBoxes } from "./posts/booster-boxes";
import { cheapLeaders } from "./posts/cheap-leaders";
import { cheaperAbroad } from "./posts/cheaper-abroad";
import { keywordsExplained } from "./posts/keywords-explained";
import { mostExpensive } from "./posts/most-expensive";
import { op18GreenLuffy } from "./posts/op18-green-luffy";
import { op18Karoo } from "./posts/op18-karoo";
import { op18SaintGunko } from "./posts/op18-saint-gunko";
import { rarities } from "./posts/rarities";
import { setReview } from "./posts/set-review";
import { whereToBuy } from "./posts/where-to-buy";
import { whereToBuyEb05 } from "./posts/where-to-buy-eb05";
import type { Post } from "./types";

// Newest first. Adding a post: write it in posts/, add it here — the blog
// index, sitemap, RSS feed and share images follow.
export const POSTS: Post[] = [
  op18GreenLuffy,
  keywordsExplained,
  op18SaintGunko,
  op18Karoo,
  whereToBuyEb05,
  setConcentration,
  budgetAltArts,
  setReview("OP17", "op17-worlds-strongest-warriors-chase-cards", "2026-10-03"),
  mostExpensive,
  boosterBoxes,
  rarities,
  whereToBuy,
  cheaperAbroad,
  cheapLeaders,
  setReview("OP16", "op16-time-of-battle-chase-cards", "2026-10-03"),
];

export function postBySlug(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export interface Author {
  slug: string;
  name: string;
  /** Short role line for the byline card. */
  role: string;
  bio: string;
  /** What this author covers, as the tags of the posts they write. */
  topics: string[];
}

/** File-based authors (RiftCompare's lib/blog/authors.ts): /authors/[slug] is generated from this list. */
export const AUTHORS: Author[] = [
  {
    slug: "op-compare-team",
    name: "OP Compare",
    role: "The team behind the site",
    bio: "The OP Compare team builds and runs the site: the price import, the store matching and the guides. Every figure in a post comes from our own price database.",
    topics: ["guide", "market", "buying", "collecting"],
  },
];

export const AUTHOR = {
  name: "OP Compare",
  url: "/authors",
  bio: "The OP Compare team builds and runs the site: the price import, the store matching and the guides. Every figure in a post comes from our own price database.",
};

/**
 * Where a post lives: guides at /guides/[slug], everything else at /blog/[slug].
 * Every link to a post goes through here (or postHrefFor): /blog/<guide> is a
 * 308 to /guides/<guide>, and a link through a redirect wastes crawl budget
 * (tests/guides.test.ts fails on a hand-built /blog/ link).
 */
export function postHref(p: Pick<Post, "slug" | "category">): string {
  return p.category === "guide" ? `/guides/${p.slug}` : `/blog/${p.slug}`;
}

/** A published post's href from its slug alone; the blog index when no such post is published. */
export function postHrefFor(slug: string): string {
  const p = postBySlug(slug);
  return p ? postHref(p) : "/blog";
}
