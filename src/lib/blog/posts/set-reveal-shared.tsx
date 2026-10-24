import Link from "next/link";
import type { ReactNode } from "react";
import { CardTable, SimpleTable } from "@/components/blog/BlogBits";
import { PRINTINGS } from "../../constants";
import { COUNTRIES, type Country } from "../../country";
import type { CardLite, Catalog, SealedLite, SetLite } from "../../data";
import { money } from "../../format";
import { PREORDER_PAGES } from "../../preorders";
import { byMarketDesc, plural } from "../util";

// Shared by the set-reveal posts (OP18 and EB05 chase cards and card lists, OP17's
// most valuable cards), RiftCompare's best-performing post shape. Every card,
// rarity, printing and price is read from the catalogue at render time, so a card
// TCGplayer has not listed yet is simply absent and no price is ever typed. The
// only typed facts are Bandai's product-page facts, quoted with their source and
// the day they were read (READ_ON) in each post.

export const READ_ON = "24 October 2026";
export const BANDAI_OP18 = "https://en.onepiece-cardgame.com/products/op18.html";
export const BANDAI_EB05 = "https://en.onepiece-cardgame.com/products/eb05.html";

export const setByCode = (cat: Catalog, code: string): SetLite | undefined => cat.sets.find((s) => s.code === code);
export const today = () => new Date().toISOString().slice(0, 10);
export const isReleased = (s: SetLite | undefined) => Boolean(s?.releasedOn && s.releasedOn <= today());

/** The set's own cards (TCGplayer's set listing), DON!! cards left out. */
export const setCards = (cat: Catalog, set: SetLite | undefined): CardLite[] =>
  set ? cat.cards.filter((c) => c.setId === set.id && c.printing !== "don") : [];

const RARITY_RANK: Record<string, number> = { SEC: 0, L: 3, SR: 2, R: 4, UC: 5, C: 6, PR: 7, TR: 1 };
const PRINT_RANK: Record<string, number> = { manga: 0, sp: 1, treasure: 1, alt: 2, standard: 3 };

/** How chase-y a printing is when no price says so: Manga, SP, then alt arts, then Secret Rares, by rarity. */
function chaseRank(c: CardLite): number {
  return (PRINT_RANK[c.printing] ?? 4) * 10 + (RARITY_RANK[c.rarity ?? ""] ?? 9);
}

/** Priced printings first (dearest first), then unpriced ones in chase order. */
export function chaseOrder(cards: CardLite[]): CardLite[] {
  const priced = cards.filter((c) => c.marketUsd != null).sort(byMarketDesc);
  const unpriced = cards.filter((c) => c.marketUsd == null).sort((a, b) => chaseRank(a) - chaseRank(b) || (a.number ?? "").localeCompare(b.number ?? ""));
  return [...priced, ...unpriced];
}

/** The chase printings: Secret Rares and every Manga, SP, Treasure and alt-art printing. */
export const chasePrintings = (cards: CardLite[]) => cards.filter((c) => c.rarity === "SEC" || c.printing === "manga" || c.printing === "sp" || c.printing === "treasure" || c.printing === "alt");

export const cardName = (c: CardLite) => `${c.name}${c.variant ? ` (${c.variant})` : ""}`;

export function CardLink({ c }: { c: CardLite }) {
  return <Link href={`/card/${c.slug}`}>{cardName(c)}</Link>;
}

/** "Printing: count" table for a set. */
export function PrintingTable({ cards }: { cards: CardLite[] }) {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.printing, (counts.get(c.printing) ?? 0) + 1);
  return (
    <SimpleTable
      head={["Printing", "Printings listed"]}
      align={["l", "r"]}
      rows={[...counts.entries()].sort((a, b) => (PRINTINGS[a[0]]?.order ?? 9) - (PRINTINGS[b[0]]?.order ?? 9)).map(([k, n]) => [PRINTINGS[k]?.label ?? k, n])}
    />
  );
}

/** "Rarity: count" over standard prints (one per card number). */
export function rarityCounts(cards: CardLite[]): [string, number][] {
  const m = new Map<string, number>();
  for (const c of cards) if (c.printing === "standard" && c.rarity) m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => (RARITY_RANK[a[0]] ?? 9) - (RARITY_RANK[b[0]] ?? 9));
}

const RARITY_LABEL: Record<string, string> = { SEC: "Secret Rare", TR: "Treasure Rare", SR: "Super Rare", L: "Leader", R: "Rare", UC: "Uncommon", C: "Common", PR: "Promo" };
export const rarityLabel = (r: string) => RARITY_LABEL[r] ?? r;

/** The card list, one table per rarity (standard prints), each card linked with its image and price. */
export function ListByRarity({ cards, cat, country }: { cards: CardLite[]; cat: Catalog; country: Country }) {
  const groups = rarityCounts(cards).map(([r]) => [r, cards.filter((c) => c.printing === "standard" && c.rarity === r).sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""))] as const);
  return (
    <>
      {groups.map(([r, cs]) => (
        <div key={r}>
          <h3>
            {rarityLabel(r)} ({r}): {cs.length}
          </h3>
          <CardTable cards={cs} setById={cat.setById} country={country} />
        </div>
      ))}
    </>
  );
}

/** The cheapest booster box in the reader's market from the sealed catalogue; "not listed yet" rather than a guess. */
export function boxSentence(set: SetLite | undefined, sealed: SealedLite[], country: Country): ReactNode {
  const m = COUNTRIES[country];
  const board = set && PREORDER_PAGES[set.code] && !isReleased(set) ? PREORDER_PAGES[set.code] : null;
  const box = set ? sealed.find((s) => s.setId === set.id && s.kind === "Booster Box") : undefined;
  const code = set?.code ?? "";
  if (!box) return <>No {code} booster box is in our catalogue yet.</>;
  const low = box.low[country];
  const word = isReleased(set) ? "listing" : "pre-order";
  return (
    <>
      {low != null ? (
        <>
          The cheapest {code} <Link href={`/sealed/${box.slug}`}>booster box</Link> {word} we track in {m.place} today is <strong>{money(low, country)}</strong>
          {box.stores[country] ? ` (${plural(box.stores[country], "tracked seller")})` : " (an eBay listing)"}, before postage
        </>
      ) : (
        <>
          No seller we track in {m.place} lists the <Link href={`/sealed/${box.slug}`}>{code} booster box</Link> yet
        </>
      )}
      {box.marketUsd != null ? <>; TCGplayer&apos;s market price is {money(box.marketUsd, "US")}</> : null}.
      {board ? (
        <>
          {" "}
          <Link href={board}>The {code} pre-order board</Link> ranks every tracked seller in your currency.
        </>
      ) : null}
    </>
  );
}

/** One line per priced card: "Name — US$x on TCGplayer, cheapest here y". */
export function priceBit(c: CardLite, country: Country): string {
  const parts: string[] = [];
  if (c.marketUsd != null) parts.push(`${money(c.marketUsd, "US")} on TCGplayer`);
  if (c.low[country] != null) parts.push(`${money(c.low[country], country)} cheapest in ${COUNTRIES[country].place}`);
  return parts.length ? parts.join(", ") : "not priced yet";
}

export const empty = (code: string) => ({ heroCards: [], summary: [], lede: <p>{code} is not in our catalogue yet.</p>, sections: [] });

export const withArt = (cards: CardLite[]) => cards.filter((c) => c.hasImage).slice(0, 3);
