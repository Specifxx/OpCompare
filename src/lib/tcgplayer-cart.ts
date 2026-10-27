/**
 * The whole list as one TCGplayer cart (Mass Entry in the URL), 2026-10-27:
 * TCGplayer credits the entire cart to the first click, so this beats "Copy
 * list". Names only: Mass Entry reads a bracket as a set code, not a card number.
 * Returns the plain tcgplayer.com URL; callers wrap it through affiliateUrl().
 */
export function tcgplayerCartUrl(lines: { qty: number; name: string }[]): string {
  const c = lines
    .filter((l) => l.qty > 0 && l.name.trim())
    .slice(0, 75)
    .map((l) => `${l.qty} ${l.name.trim()}`)
    .join("||");
  return `https://www.tcgplayer.com/massentry?productline=${encodeURIComponent("One Piece Card Game")}&c=${encodeURIComponent(c)}`;
}
