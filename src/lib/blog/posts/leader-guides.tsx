import Link from "next/link";
import type { ReactNode } from "react";
import { Callout, CardGrid, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES, type Country } from "../../country";
import type { CardLite, Catalog, CardTextIndex, SealedLite } from "../../data";
import { money } from "../../format";
import type { Post, PostContext } from "../types";
import { plural } from "../util";
import { byNumber, cardPrice, colourLabel, leaderPath, withArt } from "./op18-shared";

// LEADER GUIDES FOR RELEASED LEADERS PEOPLE SEARCH (2026-11-10, site review OP-1).
// The two OP18 leader guides brought 48 of 244 Google clicks in 56 days; these are
// the next Leaders by Search Console impressions in the `demand` branch's
// gsc-pages.json that had no guide (OP17-079 Luffy was skipped: its effect names
// Characters of cost 12 or more, which no printed card has before effects raise it).
//
// Where each fact comes from:
//  - The Leader's effect: TCGplayer's card text as the catalogue held it on
//    TEXT_READ_ON, quoted verbatim in EFFECT and labelled with that date. The
//    plain-English reading below it explains only what that text says.
//  - Every card number, name, colour, cost, Life, power and price: the catalogue
//    at render time, so a price is never typed and a card the catalogue lacks is
//    left out.
//  - The "cards the effect names" pools: the catalogue's type and name data
//    (getCardText), filtered by exactly what the effect names. They are the
//    effect's own targets, not a decklist: no decklist is printed.
//  - "What the core costs": one copy of each pool card at its cheapest tracked
//    listing in the reader's market, and the same times four (a deck may run four
//    copies of a card number). Only cards with a price there are counted, and the
//    sentence says how many.

const TEXT_READ_ON = "10 November 2026";

interface PoolSpec {
  /** "Straw Hat Crew Events of base cost 3 or less". */
  label: string;
  /** Which cards the effect names (one printing per card number is kept). */
  test: (c: CardLite, types: readonly string[]) => boolean;
}

interface LeaderSpec {
  slug: string;
  number: string;
  name: string;
  /** "Blue/Purple Sanji" for titles. */
  short: string;
  setName: string;
  title: string;
  description: string;
  effect: string[];
  /** A function, so no JSX runs when the module loads (tests import the post list without React). */
  plain: () => ReactNode;
  pool: PoolSpec;
  /** Extra section text after the pool (how the pool turns the effect on). */
  building: () => ReactNode;
  faq: { q: string; a: string }[];
  /** A starter deck that IS the Leader's deck: its slug in the sealed catalogue. */
  deckSlug?: string;
  related: { href: string; label: string }[];
}

/** number → types, from the card text index (absent in share images: then every pool is empty). */
function typesByNumber(text: CardTextIndex | undefined): Map<string, string[]> {
  if (!text) return new Map();
  return new Map(text.rows.map(([n, ts]) => [n, ts.map((i) => text.types[i])]));
}

/** The pool: one printing per card number (the standard print where there is one), by number. */
export function poolOf(cat: Catalog, text: CardTextIndex | undefined, spec: PoolSpec, leaderNumber: string): CardLite[] {
  const types = typesByNumber(text);
  if (!types.size) return [];
  const numbers = new Set<string>();
  for (const c of cat.cards) {
    if (!c.number || c.number === leaderNumber || c.printing === "don") continue;
    if (spec.test(c, types.get(c.number) ?? [])) numbers.add(c.number);
  }
  return [...numbers]
    .sort()
    .map((n) => byNumber(cat, n))
    .filter((c): c is CardLite => Boolean(c));
}

/** One copy of each priced pool card, cheapest tracked listing in the market. */
export function coreCost(pool: readonly CardLite[], country: Country): { priced: number; one: number } {
  let one = 0;
  let priced = 0;
  for (const c of pool) {
    const p = c.low[country];
    if (p == null) continue;
    one += p;
    priced++;
  }
  return { priced, one };
}

function costLine(pool: readonly CardLite[], country: Country, label: string): ReactNode {
  const m = COUNTRIES[country];
  const { priced, one } = coreCost(pool, country);
  if (!pool.length) return <>The catalogue&apos;s card types are not loaded on this view, so the list and its cost are on the full page.</>;
  if (!priced) return <>No seller we track lists any of the {plural(pool.length, "card")} in {m.place} today.</>;
  return (
    <>
      One copy of each of the {priced === pool.length ? plural(pool.length, "card") : `${priced} of the ${plural(pool.length, "card")} with a price in ${m.place}`} ({label}) costs{" "}
      <strong>{money(one, country)}</strong> at the cheapest store we track in {m.place} today, and <strong>{money(one * 4, country)}</strong> for four of each. That is the
      price of every card the effect names, not a decklist: most decks run some of them, at two to four copies, around the Leader.
    </>
  );
}

function priceTable(pool: readonly CardLite[], country: Country): ReactNode {
  if (!pool.length) return null;
  const rows = [...pool].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || (a.number ?? "").localeCompare(b.number ?? ""));
  return (
    <SimpleTable
      head={["Card", "No.", "Colour", "Cost", `Cheapest in ${COUNTRIES[country].place}`]}
      align={["l", "l", "l", "r", "r"]}
      rows={rows.map((c) => [
        <Link key="n" href={`/card/${c.slug}`}>
          {c.name}
        </Link>,
        c.number,
        colourLabel(c),
        c.cost ?? "—",
        c.low[country] != null ? money(c.low[country]!, country) : "Not listed",
      ])}
    />
  );
}

function deckLine(sealed: SealedLite[], slug: string | undefined, country: Country): ReactNode {
  if (!slug) return null;
  const d = sealed.find((s) => s.slug === slug);
  if (!d) return null;
  const m = COUNTRIES[country];
  const low = d.low[country];
  return (
    <>
      The Leader comes in <Link href={`/sealed/${d.slug}`}>{d.name}</Link>, a ready-to-play deck:{" "}
      {low != null ? (
        <>
          the cheapest tracked store in {m.place} has it at <strong>{money(low, country)}</strong> today
          {d.stores[country] ? ` (${plural(d.stores[country], "store")} listing it)` : ""}.
        </>
      ) : (
        <>no store we track in {m.place} lists it today{d.marketUsd != null ? `; TCGplayer's market price is ${money(d.marketUsd, "US")}` : ""}.</>
      )}
    </>
  );
}

function leaderGuide(s: LeaderSpec): Post {
  return {
    slug: s.slug,
    title: () => s.title,
    description: s.description,
    tags: ["guide", "leaders"],
    category: "guide",
    date: "2026-11-10",
    minutes: 5,
    faq: s.faq,
    related: [{ href: leaderPath({ name: s.name, number: s.number }), label: `${s.name} leader page` }, ...s.related],
    build: ({ cat, sealed, country, text }: PostContext) => {
      const leader = byNumber(cat, s.number);
      const pool = poolOf(cat, text, s.pool, s.number);
      const m = COUNTRIES[country];
      const leaderHref = leaderPath(leader ?? { name: s.name, number: s.number });
      const deck = deckLine(sealed, s.deckSlug, country);
      return {
        heroCards: withArt([leader, ...[...pool].sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0))]),
        summary: [
          <>
            <strong>
              {s.name}, {s.number},
            </strong>{" "}
            is a {leader ? colourLabel(leader) : ""} Leader from {s.setName}
            {leader?.life != null && leader.power != null ? `, with ${leader.life} Life and ${leader.power} power` : ""}.
          </>,
          <>{s.pool.label}: {pool.length ? `${plural(pool.length, "card number")} in our catalogue fit what the effect names.` : "listed on the full page."}</>,
          leader?.low[country] != null ? (
            <>
              The cheapest {s.name} {s.number} we track in {m.place} is <strong>{money(leader.low[country]!, country)}</strong> today.
            </>
          ) : null,
          deck,
        ].filter(Boolean),
        lede: (
          <p>
            This guide covers what the <Link href={leaderHref}>{s.name} Leader ({s.number})</Link> does, the cards its effect names, and what they cost in {m.place}{" "}
            today, from the stores we compare. Every price on this page is read live; the effect text is TCGplayer&apos;s, quoted as our catalogue held it on{" "}
            {TEXT_READ_ON}.
          </p>
        ),
        sections: [
          {
            id: "effect",
            title: `${s.name}'s effect`,
            body: (
              <>
                <Callout title={`${s.number} effect (TCGplayer's text, ${TEXT_READ_ON})`}>
                  {s.effect.map((l) => (
                    <p key={l} className="mb-1 last:mb-0">
                      {l}
                    </p>
                  ))}
                </Callout>
                {s.plain()}
              </>
            ),
          },
          {
            id: "cards",
            title: "The cards the effect names",
            body: (
              <>
                <p>
                  {s.pool.label}, in our catalogue{pool.length ? `: ${plural(pool.length, "card number")}, one printing each, cheapest store price in ${m.place}` : ""}. Check each
                  card&apos;s own text and Block Number before a Standard event.
                </p>
                {priceTable(pool, country)}
                <CardGrid cards={[...pool].filter((c) => c.hasImage).sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0)).slice(0, 6)} setById={cat.setById} country={country} />
                {s.building()}
              </>
            ),
          },
          {
            id: "cost",
            title: "What the core costs",
            body: (
              <>
                <p>{costLine(pool, country, s.pool.label.toLowerCase())}</p>
                {deck ? <p>{deck}</p> : null}
                <p>{cardPrice(cat, leader, `${s.name} ${s.number}`, country)}</p>
                <p>
                  Every card above links to its own page, where each store we compare in {m.place} is listed cheapest first, with eBay and TCGplayer pinned on top.
                </p>
              </>
            ),
          },
        ],
      };
    },
  };
}

const isColour = (c: CardLite, colours: string[]) => c.colors.some((x) => colours.includes(x));

export const sanjiOp12 = leaderGuide({
  slug: "sanji-leader-guide-op12",
  number: "OP12-041",
  name: "Sanji",
  short: "Blue/Purple Sanji",
  setName: "OP12 Legacy of the Master",
  title: "Sanji Leader OP12-041: Effect, Event Package & Prices",
  description: "The Blue/Purple Sanji Leader (OP12-041): what its Event and DON!! effect does, every Straw Hat Crew Event it can use, and what they cost today.",
  effect: [
    '[Activate: Main] [Once Per Turn] DON!! 1: Activate up to 1 "Straw Hat Crew" type Event with a base cost of 3 or less from your hand.',
    "[When Attacking] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, add up to 1 DON!! card from your DON!! deck and rest it.",
  ],
  plain: () => (
    <>
      <p>
        <strong>Part one</strong> turns Sanji into an Event engine. Once per turn, during your Main Phase, you pay the DON!! cost and activate a Straw Hat Crew Event of
        base cost 3 or less straight from your hand. The Event has to carry the Straw Hat Crew type and be Blue or Purple to be in the deck at all.
      </p>
      <p>
        <strong>Part two</strong> is catch-up ramp. When Sanji attacks and you have the same number of DON!! cards as your opponent, or fewer, you add one DON!! from
        your DON!! deck, rested. Going second, or after paying DON!! for an effect, that keeps you level.
      </p>
    </>
  ),
  pool: {
    label: "Straw Hat Crew Events of base cost 3 or less in Blue or Purple",
    test: (c, types) => c.cardType === "Event" && (c.cost ?? 99) <= 3 && isColour(c, ["Blue", "Purple"]) && types.includes("Straw Hat Crew"),
  },
  building: () => <p>The cheap Events are the point: the more of them the deck holds, the more often the once-per-turn activation has a target in hand.</p>,
  faq: [
    { q: "What colour is the Sanji OP12 Leader?", a: "Blue and Purple, with 4 Life and 5000 power as the catalogue lists it. A deck under it can use Blue and Purple cards." },
    { q: "Which Events can Sanji activate?", a: "Only Events with the Straw Hat Crew type and a base cost of 3 or less, from your hand, once per turn. The table on this page lists every one in our catalogue with its live price." },
  ],
  related: [{ href: "/sets/op12-legacy-of-the-master", label: "OP12 card list" }],
});

export const rosinanteOp12 = leaderGuide({
  slug: "rosinante-leader-guide-op12",
  number: "OP12-061",
  name: "Donquixote Rosinante",
  short: "Purple/Yellow Rosinante",
  setName: "OP12 Legacy of the Master",
  title: "Donquixote Rosinante Leader OP12-061: Effect, Law Package & Prices",
  description: "The Purple/Yellow Donquixote Rosinante Leader (OP12-061): how it protects and discounts Trafalgar Law, every Law it can use, and what they cost today.",
  effect: [
    "[Once Per Turn] If your [Trafalgar Law] would be K.O.'d, you may add 1 card from the top of your Life cards to your hand instead.",
    "[Activate: Main] [Once Per Turn] DON!! 1: The next time you play [Trafalgar Law] with a cost of 4 or more from your hand during this turn, the cost will be reduced by 2.",
  ],
  plain: () => (
    <>
      <p>
        <strong>Part one protects Law.</strong> Once per turn, when a Character named Trafalgar Law would be K.O.&apos;d, you can take the top card of your Life into
        your hand instead, and Law stays on the field. You trade a Life for the card, as Life damage would.
      </p>
      <p>
        <strong>Part two makes Law cheaper.</strong> Once per turn, for the DON!! cost, the next Trafalgar Law of cost 4 or more you play from your hand that turn costs 2
        less. A cost 7 Law comes down for 5.
      </p>
    </>
  ),
  pool: {
    label: "Trafalgar Law Characters in Purple or Yellow",
    test: (c) => c.cardType === "Character" && c.name === "Trafalgar Law" && isColour(c, ["Purple", "Yellow"]),
  },
  building: () => (
    <p>
      The cost reduction only applies to a Law of cost 4 or more, so those are the ones the Leader rewards most. The protection works on any Law on the field. Several Laws
      are promo cards (P- numbers), which is why their prices vary so much.
    </p>
  ),
  faq: [
    { q: "What colour is the Rosinante OP12 Leader?", a: "Purple and Yellow, with 4 Life and 5000 power as the catalogue lists it." },
    { q: "Does the Rosinante Leader work with every Trafalgar Law?", a: "The K.O. protection works on any Character named Trafalgar Law; the cost reduction only on a Law of cost 4 or more played from your hand. Both are once per turn." },
  ],
  related: [{ href: "/sets/op12-legacy-of-the-master", label: "OP12 card list" }],
});

export const eggheadLuffySt29 = leaderGuide({
  slug: "egghead-luffy-leader-guide-st29",
  number: "ST29-001",
  name: "Monkey.D.Luffy",
  short: "Yellow Egghead Luffy",
  setName: "Starter Deck 29: Egghead",
  title: "Egghead Luffy Leader ST29-001: Effect, Starter Deck & Prices",
  description: "The Yellow Monkey.D.Luffy Leader from Starter Deck 29: Egghead (ST29-001): what its low-Life draw does, the deck's yellow Egghead cards, and today's prices.",
  effect: ["[When Attacking] If you have 2 or less Life cards, draw 1 card and trash 1 card from your hand."],
  plain: () => (
    <>
      <p>
        Luffy starts with <strong>6 Life</strong>, more than most Leaders. Once you are down to 2 Life cards or fewer, every attack he makes draws a card and then trashes a
        card from your hand: you keep the same hand size but see a new card, so the late game, when Yellow&apos;s Life-based effects matter most, finds what you need.
      </p>
    </>
  ),
  pool: {
    label: "Yellow Egghead Characters and Events",
    test: (c, types) => (c.cardType === "Character" || c.cardType === "Event") && isColour(c, ["Yellow"]) && types.includes("Egghead"),
  },
  building: () => (
    <p>
      The effect names no card, so this list is the Leader&apos;s own crew: Yellow cards typed Egghead, as the starter deck is built. The starter deck below is the
      cheapest way to own the Leader and a playable list together.
    </p>
  ),
  deckSlug: "starter-deck-29-egghead",
  faq: [
    { q: "How much Life does the ST29 Luffy Leader have?", a: "6 Life and 5000 power, as the catalogue lists it." },
    { q: "Where do I get the Egghead Luffy Leader?", a: "In Starter Deck 29: Egghead. This page shows the cheapest store we track in your market for the deck, and for the Leader on its own." },
  ],
  related: [{ href: "/sealed/starter-deck-29-egghead", label: "Starter Deck 29: Egghead prices" }],
});

export const yamatoOp16 = leaderGuide({
  slug: "yamato-leader-guide-op16",
  number: "OP16-079",
  name: "Yamato",
  short: "Black Yamato",
  setName: "OP16 The Time of Battle",
  title: "Yamato Leader OP16-079: Effect, Land of Wano Cards & Prices",
  description: "The Black Yamato Leader (OP16-079): Rush for Land of Wano Characters played from the trash, every Black Wano Character, and what they cost today.",
  effect: ["When a {Land of Wano} type Character card is played from your trash, that Character gains [Rush] during this turn."],
  plain: () => (
    <>
      <p>
        Yamato gives <Link href="/keywords/rush">[Rush]</Link> to any Land of Wano Character you play <strong>from your trash</strong>, so it can attack the turn it comes
        back. It does nothing for a Wano Character played from your hand: the deck needs cards that put Characters into the trash and play them from there.
      </p>
    </>
  ),
  pool: {
    label: "Black Land of Wano Characters",
    test: (c, types) => c.cardType === "Character" && isColour(c, ["Black"]) && types.includes("Land of Wano"),
  },
  building: () => (
    <p>
      Yamato only rewards the Characters, so the list above is the body of the deck. What turns the effect on are the Black cards whose own text plays a Character from
      the trash: read each card&apos;s text on its page before you build.
    </p>
  ),
  faq: [
    { q: "What does the Yamato OP16 Leader do?", a: "A Land of Wano Character played from your trash gains [Rush] that turn, so it can attack straight away. It has no effect on Characters played from your hand." },
    { q: "What colour is Yamato OP16-079?", a: "Black, with 5 Life and 5000 power as the catalogue lists it." },
  ],
  related: [{ href: "/keywords/rush", label: "Every card with [Rush]" }],
});

export const moriaOp06 = leaderGuide({
  slug: "gecko-moria-leader-guide-op06",
  number: "OP06-080",
  name: "Gecko Moria",
  short: "Black Gecko Moria",
  setName: "OP06 Wings of the Captain",
  title: "Gecko Moria Leader OP06-080: Effect, Thriller Bark Cards & Prices",
  description: "The Black Gecko Moria Leader (OP06-080): how it mills and replays Thriller Bark Pirates from the trash, every card it can bring back, and today's prices.",
  effect: [
    '[DON!!×1] [When Attacking] 2 (You may rest the specified number of DON!! cards in your cost area.) You may trash 1 card from your hand: Trash 2 cards from the top of your deck and play up to 1 "Thriller Bark Pirates" type Character card with a cost of 4 or less from your trash.',
  ],
  plain: () => (
    <>
      <p>
        With at least one DON!! attached, when Moria attacks you can rest 2 DON!! in your cost area and trash a card from your hand. Then you trash the top 2 cards of your
        deck and play a Thriller Bark Pirates Character of cost 4 or less from your trash. Every attack can add a body to the board, and the 2 cards milled feed the next
        one.
      </p>
    </>
  ),
  pool: {
    label: "Black Thriller Bark Pirates Characters of cost 4 or less",
    test: (c, types) => c.cardType === "Character" && (c.cost ?? 99) <= 4 && isColour(c, ["Black"]) && types.includes("Thriller Bark Pirates"),
  },
  building: () => <p>These are the Characters Moria can play from the trash. The more of them the deck holds, the more often the milled cards give him a target.</p>,
  faq: [
    { q: "What does the Gecko Moria OP06 Leader do?", a: "When he attacks with a DON!! attached, you can rest 2 DON!! and trash a card from hand to mill 2 and play a Thriller Bark Pirates Character of cost 4 or less from your trash." },
    { q: "What colour is Gecko Moria OP06-080?", a: "Black, as the catalogue lists it. The table on this page lists every Black Thriller Bark Pirates Character of cost 4 or less with its live price." },
  ],
  related: [{ href: "/sets/op06-wings-of-the-captain", label: "OP06 card list" }],
});

export const LEADER_GUIDE_POSTS = [sanjiOp12, rosinanteOp12, eggheadLuffySt29, yamatoOp16, moriaOp06];
