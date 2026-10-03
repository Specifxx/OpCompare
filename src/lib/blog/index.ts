import { boosterBoxes } from "./posts/booster-boxes";
import { cheapLeaders } from "./posts/cheap-leaders";
import { cheaperAbroad } from "./posts/cheaper-abroad";
import { mostExpensive } from "./posts/most-expensive";
import { rarities } from "./posts/rarities";
import { setReview } from "./posts/set-review";
import { whereToBuy } from "./posts/where-to-buy";
import type { Post } from "./types";

// Newest first. Adding a post: write it in posts/, add it here — the blog
// index, sitemap, RSS feed and share images follow.
export const POSTS: Post[] = [
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

export const AUTHOR = {
  name: "OP Compare",
  url: "/authors",
  bio: "The OP Compare team builds and runs the site: the price import, the store matching and the guides. Every figure in a post comes from our own price database.",
};
