// The "Japanese edition" row test (Job A follow-ups, G2; starts 2 Dec 2026, read 16 Dec with DexCompare's 14 rows): on six
// English booster box pages, one row for the same set's Japanese booster box, as a tagged eBay SEARCH on the visitor's own
// eBay. Searches only, with no price: the matcher refuses Japanese titles on purpose (lib/match.ts) and that stays, so no
// Japanese listing is ever matched, priced, ranked or called the cheapest here. Keep the list at six until 16 Dec
// (tests/japanese-edition.test.ts).
export const JA_ROW_SETS: readonly string[] = ["OP13", "OP12", "OP09", "OP05", "OP01", "PRB-01"];

/** The code as Japanese boxes print it ("OP-13", "PRB-01"). */
export function jaPrintedCode(code: string): string {
  return code.replace(/^([A-Z]+)-?(\d+)$/, "$1-$2");
}

/** The eBay keywords for a set's Japanese booster box. */
export function jaBoxQuery(code: string): string {
  return `One Piece ${jaPrintedCode(code)} Japanese booster box`;
}
