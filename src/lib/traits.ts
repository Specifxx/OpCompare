// The trait hubs (/cards/trait/[slug]): One Piece card types such as "Straw Hat
// Crew", "Navy" or "Whitebeard Pirates", from the cached getCardText index.
// Spellings that differ only in case ("FILM" / "Film") share one hub under the
// commoner spelling. Only traits on at least TRAIT_MIN card numbers get a page,
// so the sitemap never lists a near-empty hub. Pure.
import { slugify } from "./catalog";
import type { CardTextIndex } from "./data";

export const TRAIT_MIN = 12;

export interface TraitHub {
  slug: string;
  name: string;
  /** Card numbers carrying the trait (every printing of a number shares it). */
  numbers: Set<string>;
}

export function traitHubs(text: CardTextIndex, min = TRAIT_MIN): TraitHub[] {
  const bySlug = new Map<string, { names: Map<string, number>; numbers: Set<string> }>();
  for (const [number, ts] of text.rows) {
    for (const i of ts) {
      const name = text.types[i];
      const slug = slugify(name);
      if (!slug) continue;
      const e = bySlug.get(slug) ?? bySlug.set(slug, { names: new Map(), numbers: new Set() }).get(slug)!;
      e.names.set(name, (e.names.get(name) ?? 0) + 1);
      e.numbers.add(number);
    }
  }
  return [...bySlug.entries()]
    .filter(([, e]) => e.numbers.size >= min)
    .map(([slug, e]) => ({ slug, name: [...e.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0], numbers: e.numbers }))
    .sort((a, b) => b.numbers.size - a.numbers.size || a.name.localeCompare(b.name));
}

/** The hub href for one printed trait, or null when it has no page. */
export function traitHref(hubs: TraitHub[], name: string): string | null {
  const s = slugify(name);
  return hubs.some((h) => h.slug === s) ? `/cards/trait/${s}` : null;
}
