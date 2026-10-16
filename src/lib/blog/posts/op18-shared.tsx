import Link from "next/link";
import type { ReactNode } from "react";
import { SimpleTable } from "@/components/blog/BlogBits";
import { COLOR_KEYS, type ColorKey } from "../../constants";
import { COUNTRIES, type Country } from "../../country";
import type { CardLite, Catalog, SealedLite, SetLite } from "../../data";
import { leaderSlug } from "../../facets";
import { money } from "../../format";
import { PREORDER_PAGES } from "../../preorders";
import { plural } from "../util";

// Shared by the OP18 leader guides (green Luffy, Karoo, Saint Gunko) and the
// keywords guide that uses them as examples. Where each fact comes from, all
// read on 16 October 2026:
//  - Bandai's English product page (en.onepiece-cardgame.com/products/op18.html):
//    release 20 November 2026, MSRP US$4.99 per pack, "127+1 types in total",
//    Water Seven and the Holy Knights of God as its themes, Saint Gunko and
//    Saint Shamrock as its debuts, tournament legal 7 days after release (and
//    from the pre-release date at a local store's events).
//  - Bandai's Japanese product page (onepiece-cardgame.com/products/op18.html):
//    21 November 2026, 6 cards per pack, 127+1 types.
//  - Bandai's English and Japanese card lists: no OP18 series yet (newest OP-17).
//  - Card numbers, names, colours, rarity, cost, power, Life and every price:
//    the catalogue, read at render time, so a card TCGplayer has not listed is
//    simply left out and a price is never typed.
//  - Card TEXT, types and attribute: TCGplayer's pre-release listings as the
//    catalogue held them that day, quoted in REPORTED below and always labelled
//    "reported" with that date. Each card's own page shows the text as it stands.
// Links to other posts are literal paths at each post's own URL (postHref): these
// files are imported by lib/blog/index.ts, so they cannot import postHrefFor back.

export const OP18 = "OP18";
export const OP18_PREORDERS = PREORDER_PAGES[OP18];
/** The day the reported text and Bandai's pages were read. */
export const READ_ON = "16 October 2026";

/** The four posts' own URLs (they are guides: /guides/<slug>). */
export const GUIDE = {
  luffy: "/guides/op18-green-luffy-leader-deck-guide",
  karoo: "/guides/karoo-leader-guide-op18",
  gunko: "/guides/saint-gunko-leader-guide-op18",
  keywords: "/guides/one-piece-tcg-keywords-explained",
} as const;

/** The three Leaders the guides are about. */
export const LEADER = {
  luffy: { name: "Monkey.D.Luffy", number: "OP18-022" },
  karoo: { name: "Karoo", number: "OP18-001" },
  gunko: { name: "Saint Gunko", number: "OP18-060" },
} as const;

/** A Leader's /leaders/[slug] URL from its name and number (lib/facets.ts leaderSlug, the route's own slug). */
export const leaderPath = (l: { name: string; number: string | null }) => `/leaders/${leaderSlug(l.name, l.number)}`;

export interface Reported {
  types: string[];
  attribute?: string;
  /** One entry per ability, as TCGplayer's listing prints it. */
  text: string[];
}

/** Pre-release text as TCGplayer listed it on READ_ON. Never presented as Bandai's. */
export const REPORTED: Record<string, Reported> = {
  "OP18-001": {
    types: ["Animal", "Alabasta"],
    attribute: "Strike",
    text: ["All of your Characters with both the {Animal} and {Alabasta} types gain [Rush] and +1000 power.", "[Once Per Turn] When your {Alabasta} type Character is K.O.'d, draw 1 card."],
  },
  "OP18-021": {
    types: ["Straw Hat Crew", "Water Seven", "The Franky Family"],
    attribute: "Strike",
    text: ["All Stage cards in your hand have a +3000 Counter.", "[Activate: Main] [Once Per Turn] DON!! −1: Play up to 1 Stage card with a cost of 5 or less from your hand."],
  },
  "OP18-022": {
    types: ["Straw Hat Crew", "Water Seven"],
    attribute: "Strike",
    text: ["[DON!! ×3] [When Attacking] [Once Per Turn] You may set this Leader as active. If you do, this Leader will not become active in your next Refresh Phase."],
  },
  "OP18-060": {
    types: ["Celestial Dragons", "Holy Knights of God"],
    attribute: "Special",
    text: [
      "[Once Per Turn] When a Character is played from your trash, draw 2 cards and trash 1 card from your hand.",
      "[Activate: Main] [Once Per Turn] You may trash 1 card from your hand: If you have a Character with 8000 base power or more, add up to 1 DON!! card as active from your DON!! deck.",
    ],
  },
  "OP18-024": {
    types: ["Water Seven", "Merfolk"],
    text: ["[Blocker]", "[End of Your Turn] You may trash this Character: Set your Leader as active."],
  },
  "OP18-025": { types: ["Animal", "Water Seven"], text: ["[End of Your Turn] If this Character is rested, set your Leader as active."] },
  "OP18-028": { types: ["Water Seven"], text: ["[Activate: Main] You may rest 1 of your [Gonbe] and this Character: Set your [Monkey.D.Luffy] Leader as active."] },
  "OP18-031": {
    types: ["Straw Hat Crew", "Water Seven"],
    text: [
      "[Opponent's Turn] If your Character would be removed from the field by your opponent's effect, you may rest this Character instead.",
      "[End of Your Turn] Set up to 1 of your {Water Seven} type cards and up to 1 of your DON!! cards as active.",
    ],
  },
  "OP18-016": { types: ["Alabasta", "Straw Hat Crew"], text: ["[Banish]", "[On K.O.] Play up to 1 {Alabasta} type Character card with 6000 power or less from your hand."] },
  "OP18-017": {
    types: ["Alabasta", "Straw Hat Crew"],
    text: [
      "[Once Per Turn] If your {Alabasta} type Character would be removed from the field by your opponent's effect, you may give your Leader −2000 power during this turn instead.",
      "[When Attacking] Up to 1 of your {Alabasta} type Characters gains [Rush] during this turn.",
    ],
  },
  "OP18-085": {
    types: ["Holy Knights of God"],
    text: ["[Activate: Main] You may return this Character to the owner's hand: Up to 1 of your [Saint Shamrock] Characters gains [Rush], [Banish], or [Unblockable] during this turn."],
  },
  "OP18-119": {
    types: ["Celestial Dragons", "Holy Knights of God"],
    text: [
      "[On K.O.] You may trash 1 card from your hand: Play this Character card from your trash.",
      "[Activate: Main] [Once Per Turn] If this Character was played on this turn, play up to 1 {Holy Knights of God} type Character card with a cost of 6 or less from your trash.",
    ],
  },
  "OP18-076": {
    types: ["Straw Hat Crew"],
    text: [
      "[On Play] Draw 1 card, then add up to 1 DON!! card as rested from your DON!! deck.",
      "[On Your Opponent's Attack] You may rest this Stage: Your Leader with 5000 power or less and up to 2 of your Characters gain +1000 power during this turn.",
    ],
  },
};

/** What each OP18 Leader's reported text does, in one line (the comparison tables). */
export const LEADER_PLANS: Record<string, string> = {
  "OP18-001": "Rush and +1000 power for Characters typed both Animal and Alabasta; draws a card when an Alabasta Character is K.O.'d",
  "OP18-021": "Stage cards in hand get a +3000 Counter; DON!! −1 plays a Stage of cost 5 or less from hand",
  "OP18-022": "With 3 DON!! it sets itself active when it attacks, so it attacks twice; then it misses its next refresh",
  "OP18-041": "When a Baroque Works Character of 3000 base power or more is K.O.'d, draws a card and makes the opponent trash one",
  "OP18-060": "Draws 2 and trashes 1 when a Character is played from the trash; with an 8000-power Character out, trashes a card for an active DON!!",
  "OP18-079": "Rests 2 DON!! and itself and trashes a CP card to put the top card of the deck on top of its Life",
};

/**
 * Character card numbers TCGplayer typed both Animal and Alabasta on READ_ON (Karoo's
 * Rush). Each is shown only when the catalogue holds it, with its live price.
 */
export const ANIMAL_ALABASTA = ["OP18-003", "OP18-010", "EB02-001", "OP15-004", "OP15-013", "OP04-004", "OP04-005", "OP04-009", "OP04-010", "ST01-003"];
/** OP18 Character card numbers TCGplayer typed Holy Knights of God on READ_ON. */
export const HOLY_KNIGHTS = ["OP18-085", "OP18-119"];

export const op18Set = (cat: Catalog): SetLite | undefined => cat.sets.find((s) => s.code === OP18);

/** The standard print of a card number (else its first printing), or undefined when the catalogue lacks it. */
export function byNumber(cat: Catalog, number: string): CardLite | undefined {
  const prints = cat.cards.filter((c) => c.number === number && c.printing !== "don");
  return prints.find((c) => c.printing === "standard") ?? prints[0];
}

/** The catalogue's printings of each number, in the order given, missing ones dropped. */
export const cardsOf = (cat: Catalog, numbers: readonly string[]): CardLite[] => numbers.map((n) => byNumber(cat, n)).filter((c): c is CardLite => Boolean(c));

/** "Red/Blue": a card's colours in the game's own order. */
export const colourLabel = (c: Pick<CardLite, "colors">): string =>
  [...c.colors].sort((a, b) => COLOR_KEYS.indexOf(a as ColorKey) - COLOR_KEYS.indexOf(b as ColorKey)).join("/");

/** The OP18 Leaders the catalogue holds (standard prints), by card number. */
export function op18Leaders(cat: Catalog): CardLite[] {
  const set = op18Set(cat);
  if (!set) return [];
  return cat.cards.filter((c) => c.setId === set.id && c.cardType === "Leader" && c.printing === "standard" && c.number).sort((a, b) => a.number!.localeCompare(b.number!));
}

/** "A, B and C". */
export const andList = (xs: string[]): string => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Hero strip: the cards given, only those with art (an OP18 card has none until its image is listed). */
export const withArt = (cards: (CardLite | undefined)[]): CardLite[] => cards.filter((c): c is CardLite => Boolean(c?.hasImage)).slice(0, 3);

const today = () => new Date().toISOString().slice(0, 10);
const released = (set: SetLite | undefined) => Boolean(set?.releasedOn && set.releasedOn <= today());

export function ReportedNote() {
  return (
    <p>
      <em>
        OP18 card text in this guide is the reported pre-release text, as TCGplayer listed it on {READ_ON}. Bandai&apos;s official card list has no OP18 cards
        yet, so the final English wording may differ; each card&apos;s page on OP Compare shows the text as it stands.
      </em>
    </p>
  );
}

/** A card's facts block: number, type, colours, Life/cost and power from the catalogue; types and text from REPORTED. */
export function ReportedCard({ number, name, c }: { number: string; name: string; c?: CardLite }) {
  const r = REPORTED[number];
  return (
    <>
      <p>
        <strong>
          {c ? <Link href={c.cardType === "Leader" ? leaderPath(c) : `/card/${c.slug}`}>{c.name}</Link> : name}, {number}
          {c?.cardType ? `, ${c.cardType}` : ""}
          {c?.colors.length ? `, ${colourLabel(c)}` : ""}
        </strong>
      </p>
      <ul>
        {c?.life != null ? <li>Life: {c.life}</li> : null}
        {c?.cost != null ? <li>Cost: {c.cost}</li> : null}
        {c?.power != null ? <li>Power: {c.power}</li> : null}
        {r?.attribute ? <li>Attribute: {r.attribute} (reported)</li> : null}
        {r?.types.length ? <li>Types: {r.types.join(" / ")} (reported)</li> : null}
      </ul>
      {r ? (
        <blockquote>
          <p>
            <strong>Reported text ({READ_ON}):</strong>
          </p>
          {r.text.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </blockquote>
      ) : null}
    </>
  );
}

/** One quoted ability list for a card in a running list ("Gonbe (OP18-025, C, cost 1): …"). */
export function ReportedLine({ number, name, c }: { number: string; name: string; c?: CardLite }) {
  const r = REPORTED[number];
  return (
    <>
      <strong>{c ? <Link href={`/card/${c.slug}`}>{c.name}</Link> : name}</strong> ({number}
      {c?.rarity ? `, ${c.rarity}` : ""}
      {c?.cost != null ? `, cost ${c.cost}` : ""}
      {c?.power != null ? `, ${c.power} power` : ""}
      ){r ? <>: &ldquo;{r.text.join(" ")}&rdquo;</> : null}
    </>
  );
}

/** The cheapest live listing of one card in the reader's market, and TCGplayer's market price; never a typed figure. */
export function cardPrice(cat: Catalog, c: CardLite | undefined, label: string, country: Country): ReactNode {
  const m = COUNTRIES[country];
  const pre = !released(op18Set(cat));
  if (!c) return <>{label} is not in our catalogue yet, so there is no price to show.</>;
  const low = c.low[country];
  const market = c.marketUsd;
  return (
    <>
      {low != null ? (
        <>
          The cheapest {label} listing we track in {m.place} is <strong>{money(low, country)}</strong>
        </>
      ) : (
        <>No seller we track lists {label} in {m.place} yet</>
      )}
      {market != null ? <>, and TCGplayer&apos;s market price is {money(market, "US")}</> : null}.
      {low == null && market == null ? null : pre ? " Before release these are pre-order prices, and they move daily." : " Prices move daily."}
    </>
  );
}

/** The cheapest OP18 booster box in the reader's market, from the sealed catalogue; "not listed yet" rather than a guess. */
export function boxLine(cat: Catalog, sealed: SealedLite[], country: Country): ReactNode {
  const set = op18Set(cat);
  const m = COUNTRIES[country];
  const board = <Link href={OP18_PREORDERS}>the OP18 pre-order board</Link>;
  const box = set ? sealed.find((s) => s.setId === set.id && s.kind === "Booster Box") : undefined;
  if (!box) return <>No OP18 booster box is in our catalogue yet; {board} lists it as soon as a seller does.</>;
  const low = box.low[country];
  const word = released(set) ? "listing" : "pre-order";
  if (low == null) return <>No seller we track in {m.place} has listed an OP18 booster box yet; {board} fills in as they do, in {m.currency}.</>;
  return (
    <>
      The cheapest OP18 booster box {word} we track in {m.place} today is <strong>{money(low, country)}</strong>
      {box.stores[country] ? ` (${plural(box.stores[country], "tracked seller")} listing it)` : " (an eBay listing; no tracked store has one yet)"}, before postage.{" "}
      <Link href={OP18_PREORDERS}>The OP18 pre-order board</Link> ranks every seller in your market, cheapest first.
    </>
  );
}

/** The OP18 Leaders side by side: name, colours and Life from the catalogue, the plan from their reported text. */
export function LeaderTable({ cat, highlight }: { cat: Catalog; highlight?: string }) {
  const leaders = op18Leaders(cat);
  if (!leaders.length) return <p>No OP18 Leader is in our catalogue yet.</p>;
  return (
    <SimpleTable
      head={["Leader", "No.", "Colours", "Life", "What it does (reported)"]}
      align={["l", "l", "l", "r", "l"]}
      rows={leaders.map((l) => [
        <Link key="n" href={leaderPath(l)}>
          {l.number === highlight ? <strong>{l.name}</strong> : l.name}
        </Link>,
        l.number,
        colourLabel(l),
        l.life ?? "—",
        LEADER_PLANS[l.number!] ?? "Text not listed yet",
      ])}
    />
  );
}
