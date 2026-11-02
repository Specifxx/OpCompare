// Which card pages ask Google to index them (Search Console, 2026-10-31: 5,901
// of ~7,350 card pages "Discovered – currently not indexed"). Google found every
// printing through the sitemap and chose not to crawl most of them: thousands of
// near-identical pages tell it the site is templated. So the thinnest printings
// stay reachable (linked from their set and their siblings) but are noindex,
// follow and out of the sitemap, and Google's crawl goes to pages worth ranking:
//
//   - a printing with no price anywhere and no store stock (nothing to compare;
//     Google reports these as soft 404s), and
//   - a non-standard printing (promo, reprint, foil...) of a number that has
//     another printing, worth under US$1 at TCGplayer: the cheap reprint of a
//     common whose own page already answers the search.
//
// Leaders, standard printings, any printing worth US$1+, any printing that is
// the only one of its number, and every card of an unreleased set (spoiler
// season: revealed cards have no price yet, and are what people search) stay
// indexable. Reads only `marketUsd`, `low`
// and `stores`, never the display-only last known price. Pinned by
// tests/card-index.test.ts. DECISIONS.md, 2026-11-02.
import type { CardLite } from "./data";

type Indexed = Pick<CardLite, "id" | "number" | "printing" | "cardType" | "marketUsd" | "low" | "stores" | "setId">;

/** Cents: a non-standard duplicate printing under this is thin. */
export const THIN_VARIANT_MAX_CENTS = 100;

function priced(c: Indexed): boolean {
  return c.marketUsd != null || Object.values(c.low).some((v) => v != null) || Object.values(c.stores).some((n) => n > 0);
}

/** Every thin card's id, decided against the whole catalogue (siblings share a number). */
export function thinCardIds(cards: readonly Indexed[], upcomingSetIds: ReadonlySet<number> = new Set()): Set<number> {
  const perNumber = new Map<string, number>();
  for (const c of cards) if (c.number) perNumber.set(c.number, (perNumber.get(c.number) ?? 0) + 1);
  const thin = new Set<number>();
  for (const c of cards) if (!upcomingSetIds.has(c.setId) && isThin(c, c.number ? perNumber.get(c.number) ?? 1 : 1)) thin.add(c.id);
  return thin;
}

/** One card, given how many printings share its number (itself included). */
export function isThin(c: Indexed, printingsOfNumber: number): boolean {
  if (!priced(c)) return true;
  if (c.cardType === "Leader" || c.printing === "standard" || printingsOfNumber < 2) return false;
  return (c.marketUsd ?? 0) < THIN_VARIANT_MAX_CENTS;
}

/** The card page's check: counts its siblings in the catalogue it already holds. */
export function cardIsThin(c: Indexed, cards: readonly Indexed[], upcomingSetIds: ReadonlySet<number> = new Set()): boolean {
  if (upcomingSetIds.has(c.setId)) return false;
  const n = c.number ? cards.reduce((k, x) => k + (x.number === c.number ? 1 : 0), 0) : 1;
  return isThin(c, n);
}

/**
 * A card URL that no longer exists (a renamed variant, a slug that gained or
 * lost a suffix): the printing it most likely meant, or null. Search Console
 * listed 49 card 404s on 2026-10-31. Only a sure answer redirects: the slug
 * must hold a card number, and the printings of that number must leave exactly
 * one candidate (the only printing, or the one standard printing whose name
 * matches the old slug's). Anything less stays a 404 rather than a guess.
 */
export function movedCardSlug(slug: string, cards: readonly Pick<CardLite, "slug" | "number" | "printing">[]): string | null {
  const m = /(?:^|-)((?:[a-z]{1,4}\d{0,2}-)?\d{3})(?:-|$)/.exec(slug);
  if (!m) return null;
  const num = m[1];
  const namePart = slug.slice(0, m.index);
  const same = cards.filter((c) => c.number && c.number.toLowerCase() === num && c.slug !== slug);
  if (same.length === 1) return same[0].slug;
  const named = same.filter((c) => c.printing === "standard" && (!namePart || c.slug.startsWith(namePart)));
  return named.length === 1 ? named[0].slug : null;
}

/** The sets not released yet on `today` (YYYY-MM-DD): their revealed cards are always indexable. */
export function upcomingSetIds(sets: readonly { id: number; releasedOn: string | null }[], today: string = new Date().toISOString().slice(0, 10)): Set<number> {
  return new Set(sets.filter((s) => !!s.releasedOn && s.releasedOn > today).map((s) => s.id));
}
