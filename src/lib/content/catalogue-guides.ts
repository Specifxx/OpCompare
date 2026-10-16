import { POSTS, postHref } from "@/lib/blog";
import type { RelatedGuide } from "@/lib/content/tool-guides";

// Which of our guides explains each catalogue page (card, sets, sealed, price
// guide, market, movers), read by RelatedGuides. Same rules as tool-guides.ts:
// at most three, most useful first, each `reason` says what the POST covers,
// only published posts (a retired slug drops out), no invest or flip framing.
// Kept beside tool-guides so the tools track's file is untouched.
type Ref = { slug: string; reason: string };

export const CATALOGUE_GUIDES = {
  card: [
    { slug: "one-piece-card-rarities-explained", reason: "What Leader, SR, SEC, Parallel, SP, Treasure and Manga printings are, and why they price so far apart" },
    { slug: "where-to-buy-one-piece-cards", reason: "Which stores in your market carry One Piece singles, and how they compare" },
    { slug: "are-one-piece-cards-cheaper-abroad", reason: "Whether a cross-market price gap survives postage and import tax" },
  ],
  sealed: [
    { slug: "one-piece-booster-box-prices", reason: "What a booster box costs in each market, and where it is cheapest" },
    { slug: "where-to-buy-one-piece-cards", reason: "How the stores we compare differ on price and stock" },
  ],
  sets: [
    { slug: "one-piece-card-rarities-explained", reason: "What the rarities and special printings in a set mean for price" },
    { slug: "most-expensive-one-piece-cards", reason: "The priciest cards right now, and what most of them have in common" },
    { slug: "one-piece-booster-box-prices", reason: "What a booster box of a set costs, market by market" },
  ],
  "price-guide": [
    { slug: "one-piece-card-rarities-explained", reason: "Why printings of one card are priced so far apart" },
    { slug: "most-expensive-one-piece-cards", reason: "The priciest One Piece cards and what drives them" },
    { slug: "cheapest-one-piece-leaders", reason: "Budget Leaders to build around, priced in your market" },
  ],
  market: [
    { slug: "most-expensive-one-piece-cards", reason: "Which cards the index's top end is made of" },
    { slug: "one-piece-card-rarities-explained", reason: "Why Parallel, Manga and SP printings move differently from standard prints" },
  ],
  movers: [
    { slug: "most-expensive-one-piece-cards", reason: "The priciest cards right now and what most of them have in common" },
    { slug: "are-one-piece-cards-cheaper-abroad", reason: "Why a price gap between markets is not always a bargain" },
  ],
} as const satisfies Record<string, readonly Ref[]>;

export type CatalogueGuideRoute = keyof typeof CATALOGUE_GUIDES;

/**
 * Guides about one set's own cards, by set code: shown first on that set's page
 * (guidesForSet) and alone on its pre-order board (setOwnGuides). A set with
 * none keeps the generic "sets" list.
 */
export const SET_GUIDES: Record<string, readonly Ref[]> = {
  OP18: [
    { slug: "op18-green-luffy-leader-deck-guide", reason: "The mono-green Monkey.D.Luffy Leader: its attack-twice effect and the green cards that untap it" },
    { slug: "karoo-leader-guide-op18", reason: "The Red/Blue Karoo Leader: Rush for Characters typed both Animal and Alabasta" },
    { slug: "saint-gunko-leader-guide-op18", reason: "The Purple/Black Saint Gunko Leader: playing Characters from the trash, and DON!! ramp" },
  ],
};

/** A Leader's own guide, by card number (the /leaders/[slug] page shows it). */
export const LEADER_GUIDES: Record<string, Ref> = {
  "OP18-001": { slug: "karoo-leader-guide-op18", reason: "What Karoo's effect does, the Animal and Alabasta Characters it wants, and where to buy OP18" },
  "OP18-022": { slug: "op18-green-luffy-leader-deck-guide", reason: "What the attack-twice effect does, the green cards that untap it, and how the deck plays" },
  "OP18-060": { slug: "saint-gunko-leader-guide-op18", reason: "How the trash and DON!! halves of her effect work, and the OP18 cards to watch" },
};

function resolve(refs: readonly Ref[], limit: number): RelatedGuide[] {
  const bySlug = new Map(POSTS.map((p) => [p.slug, p]));
  const out: RelatedGuide[] = [];
  for (const g of refs) {
    const p = bySlug.get(g.slug);
    if (!p || out.some((o) => o.slug === p.slug)) continue;
    out.push({
      slug: p.slug,
      title: p.title({ cat: { pricesAt: new Date().toISOString() } as never }),
      href: postHref(p),
      reason: g.reason,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function guidesForCatalogue(route: CatalogueGuideRoute, limit = 3): RelatedGuide[] {
  return resolve(CATALOGUE_GUIDES[route], limit);
}

/** A set page's "Read next": the set's own guides first, then the generic set guides. */
export function guidesForSet(code: string, limit = 3): RelatedGuide[] {
  return resolve([...(SET_GUIDES[code] ?? []), ...CATALOGUE_GUIDES.sets], limit);
}

/** Only the set's own guides (a pre-order board shows nothing generic). */
export function setOwnGuides(code: string, limit = 3): RelatedGuide[] {
  return resolve(SET_GUIDES[code] ?? [], limit);
}

/** A Leader page's guide: its own, when one is published. */
export function guidesForLeader(number: string | null): RelatedGuide[] {
  const g = number ? LEADER_GUIDES[number] : undefined;
  return g ? resolve([g], 1) : [];
}
