// The weekly Hot 100 (owner, 2026-11-18: Rift Compare's Hot chart, for every site): one stable URL, /hot-100, posted to Reddit
// once a week as a plain link and title. The cards whose TCGplayer market price rose most over the last seven days (the
// catalogue's own change7d, the number /movers ranks by), biggest rise first, up to 100, worth US$3 or more. A week with 37 such
// cards is the Hot 37, never padded (RiftCompare's Hot 40 rule). Pure: the page passes the cached catalogue.
import type { CardLite } from "./data";

export const HOT_MAX = 100;
export const HOT_MIN_USD_CENTS = 300;

export function hotCards(cards: CardLite[], max = HOT_MAX): CardLite[] {
  return cards
    .filter((c) => c.change7d != null && c.change7d > 0 && (c.marketUsd ?? 0) >= HOT_MIN_USD_CENTS)
    .sort((a, b) => b.change7d! - a.change7d! || (b.marketUsd ?? 0) - (a.marketUsd ?? 0) || a.id - b.id)
    .slice(0, max);
}

export const hotName = (n: number) => `Hot ${n}`;
