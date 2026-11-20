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
  /** The post's date (default 2026-11-10, the first round). */
  date?: string;
  /** The day the effect text was read (default TEXT_READ_ON). */
  readOn?: string;
  /** Extra tags (a set code, lower case). */
  tags?: string[];
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
    tags: ["guide", "leaders", ...(s.tags ?? [])],
    category: "guide",
    date: s.date ?? "2026-11-10",
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
            {s.readOn ?? TEXT_READ_ON}.
          </p>
        ),
        sections: [
          {
            id: "effect",
            title: `${s.name}'s effect`,
            body: (
              <>
                <Callout title={`${s.number} effect (TCGplayer's text, ${s.readOn ?? TEXT_READ_ON})`}>
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

// OP18 THE DOMINANCE OF GOD, RELEASE DAY (2026-11-20). The OP18 Leader guides
// (green Luffy, Karoo, Saint Gunko) are OP Compare's best-earning pages in Search
// Console ("op18 green luffy deck list" and friends, positions 7-8); these are the
// other three OP18 Leaders, written the day the set came out, from TCGplayer's
// post-release text as the catalogue held it on OP18_READ_ON. Card names in the
// building notes are linked by their catalogue slugs; no price is typed.
const OP18_READ_ON = "20 November 2026";
const OP18_PACK = { href: "/guides/op18-booster-box-price", label: "OP18 booster box prices" };
const OP18_SET = { href: "/sets/op18-the-dominance-of-god", label: "OP18 card list" };
const OP18_LINKS = [OP18_SET, OP18_PACK, { href: "/guides/op18-green-luffy-leader-deck-guide", label: "OP18 green Luffy deck guide" }];
const card = (slug: string, name: string, number: string) => (
  <>
    <Link href={`/card/${slug}`}>{name}</Link> ({number})
  </>
);
/** A function: no JSX may run when the module loads (tests import the post list without React). */
const blockOne = () => (
  <p>
    One check before a Standard event: from April 2026 to March 2027 Bandai&apos;s Standard Regulation leaves out Block 1 cards (booster packs 1 to 4) unless the card&apos;s Block Number has been updated, so read the printed Block Number on any OP01 to OP04 card in the table.
  </p>
);

export const frankyOp18 = leaderGuide({
  slug: "franky-leader-guide-op18",
  number: "OP18-021",
  name: "Franky",
  short: "Green/Purple Franky",
  setName: "OP18 The Dominance of God",
  title: "Franky Leader OP18-021: Effect, Stage Deck & Prices",
  description: "The Green/Purple Franky Leader (OP18-021): how it turns Stages into counters and plays them for DON!! −1, the OP18 Stages it wants, and today's prices.",
  date: "2026-11-20",
  readOn: OP18_READ_ON,
  tags: ["op18"],
  effect: ["All Stage cards in your hand have a +3000 Counter.", "[Activate:Main] [Once Per Turn] DON!! -1: Play up to 1 Stage card with a cost of 5 or less from your hand."],
  plain: () => (
    <>
      <p>
        <strong>Part one</strong> fixes the oldest problem with Stages: a Stage in hand normally does nothing on your opponent&apos;s turn. Under Franky every Stage in
        your hand counts as a +3000 Counter, as big as the best Character counters, so a hand full of ships is also a hand full of defence.
      </p>
      <p>
        <strong>Part two</strong> is the engine. Once per turn you return one DON!! card from your field to your DON!! deck (that is what DON!! −1 means) and play a Stage
        of cost 5 or less from your hand for free. The four 5-cost OP18 ships below each say &ldquo;[On Play] Draw 1 card, then add up to 1 DON!! card as rested from
        your DON!! deck&rdquo;, so the DON!! you returned comes straight back, rested: you keep your DON!! count, draw a card and put a 5-cost Stage on the field for
        nothing.
      </p>
    </>
  ),
  pool: {
    label: "Green or Purple Stages of cost 5 or less",
    test: (c) => c.cardType === "Stage" && (c.cost ?? 99) <= 5 && isColour(c, ["Green", "Purple"]),
  },
  building: () => (
    <>
      <p>
        <strong>The ships.</strong> OP18 prints four purple 5-cost Stages, each with the same draw-and-ramp On Play and a second job:{" "}
        {card("thousand-sunny-op18-075", "Thousand Sunny", "OP18-075")} sets a Straw Hat Crew Character with 7000 power or less active for DON!! −2;{" "}
        {card("shark-submerge-3-op18-076", "Shark Submerge 3", "OP18-076")} rests to give your Leader and two Characters +1000 on your opponent&apos;s attack;{" "}
        {card("white-hobby-horse-1-op18-077", "White Hobby Horse 1", "OP18-077")} gives a Straw Hat Crew Character [Rush: Character]; and{" "}
        {card("mini-merry-op18-078", "Mini-Merry", "OP18-078")} hands out up to four rested DON!!. They are the reason the Leader exists.
      </p>
      <p>
        <strong>The payoffs.</strong> OP18&apos;s Franky Family Characters spend Stages you have already cashed in: {card("zambai-op18-066", "Zambai", "OP18-066")} K.O.s
        one of your Stages to gain [Rush], {card("kiwi-and-mozu-op18-063", "Kiwi & Mozu", "OP18-063")} K.O.s one to add a DON!!, and{" "}
        {card("the-franky-family-op18-072", "The Franky Family", "OP18-072")} K.O.s one to give an opponent&apos;s Character −3000. To keep the Stages coming,{" "}
        {card("iceburg-op18-061", "Iceburg", "OP18-061")} looks at five cards for two Stages or Water Seven cards, and {card("tom-op18-070", "Tom", "OP18-070")} returns two
        Stages from your trash to your hand. The Character {card("franky-op18-034", "Franky", "OP18-034")} plays a Franky Family or Straw Hat Crew card of cost 5 or less
        from hand (a ship counts) and then, with a 5-cost Stage out, rests an opponent&apos;s Character, and the Counter Event{" "}
        {card("can-you-please-sail-on-the-ship-i-made-op18-074", "Can You Please Sail on the Ship I Made?!", "OP18-074")} gives +4000 while you have one.
      </p>
      <p>
        The shape that follows: every turn, cheat out a ship, draw, keep your DON!!, then either keep it for its second ability or K.O. it for a payoff, and refill from the
        trash with Tom. The cost is tempo early on, since the Leader&apos;s 5000 power and 4 Life give no help on the board by themselves.
      </p>
      {blockOne()}
    </>
  ),
  faq: [
    {
      q: "What does the Franky OP18 Leader do?",
      a: "Stage cards in your hand get a +3000 Counter, and once per turn you can return one DON!! (DON!! −1) to play a Stage of cost 5 or less from your hand for free. OP18's four 5-cost ships draw a card and add the DON!! back, rested, when they are played.",
    },
    { q: "What colour is the Franky OP18-021 Leader?", a: "Green and Purple, with 4 Life and 5000 power as the catalogue lists it. The table on this page lists every Green or Purple Stage of cost 5 or less, priced live." },
    { q: "When did OP18 come out?", a: "OP18 The Dominance of God was released in English on 20 November 2026, by Bandai's product page. Box prices at every store we track are on the OP18 booster box page." },
  ],
  related: OP18_LINKS,
});

export const allSundayOp18 = leaderGuide({
  slug: "ms-all-sunday-leader-guide-op18",
  number: "OP18-041",
  name: "Ms. All Sunday",
  short: "Blue Ms. All Sunday",
  setName: "OP18 The Dominance of God",
  title: "Ms. All Sunday Leader OP18-041: Effect, Baroque Works & Prices",
  description: "The Blue Ms. All Sunday Leader (OP18-041): how a K.O.'d Baroque Works Character draws you a card and makes your opponent discard, and every card it wants, priced.",
  date: "2026-11-20",
  readOn: OP18_READ_ON,
  tags: ["op18"],
  effect: ["When your Character with a type including \"Baroque Works\" and 3000 base power or more is K.O.'d, draw 1 card, and your opponent trashes 1 card from their hand."],
  plain: () => (
    <>
      <p>
        Every time one of your Baroque Works Characters with a base power of 3000 or more is K.O.&apos;d, you draw a card <strong>and</strong> your opponent trashes one
        from their hand. Each trade is a two-card swing: you replace what you lost and they lose a card they were keeping, often a Counter.
      </p>
      <p>
        Two details matter. It is <strong>base</strong> power, so a 2000-power Character pumped to 3000 does not count, and the text has no once-per-turn limit: two
        Characters K.O.&apos;d in one turn trigger it twice. It only fires on a K.O., not when a Character is returned to hand or trashed by another effect.
      </p>
    </>
  ),
  pool: {
    label: "Blue Baroque Works Characters with 3000 power or more",
    test: (c, types) => c.cardType === "Character" && (c.power ?? 0) >= 3000 && isColour(c, ["Blue"]) && types.some((t) => t.includes("Baroque Works")),
  },
  building: () => (
    <>
      <p>
        The deck wants many bodies in that range at low cost, so that every trade your opponent makes costs them a card. OP18 adds 13 Blue Baroque Works Characters of 3000 power or more
        to the older ones from OP01, EB01 and earlier starter decks; the table lists every one in our catalogue. Blockers and cheap Characters that trade well are
        the ones that turn the effect on most often, because your opponent has to attack or remove them.
      </p>
      {blockOne()}
    </>
  ),
  faq: [
    {
      q: "What does the Ms. All Sunday OP18 Leader do?",
      a: "When one of your Baroque Works Characters with 3000 base power or more is K.O.'d, you draw a card and your opponent trashes a card from their hand. It has no once-per-turn limit.",
    },
    { q: "What colour is Ms. All Sunday OP18-041?", a: "Blue, with 5 Life and 5000 power as the catalogue lists it." },
    { q: "Is Ms. All Sunday the same character as Nico Robin?", a: "Yes. Ms. All Sunday is Nico Robin's Baroque Works code name in the Alabasta arc; this Leader carries the Baroque Works type." },
  ],
  related: OP18_LINKS,
});

export const spandamOp18 = leaderGuide({
  slug: "spandam-leader-guide-op18",
  number: "OP18-079",
  name: "Spandam",
  short: "Black/Yellow Spandam",
  setName: "OP18 The Dominance of God",
  title: "Spandam Leader OP18-079: Effect, CP Cards & Prices",
  description: "The Black/Yellow Spandam Leader (OP18-079): how trashing a CP card adds Life, every Black or Yellow CP card it can use, and what they cost today.",
  date: "2026-11-20",
  readOn: OP18_READ_ON,
  tags: ["op18"],
  effect: ['[Activate: Main] You may rest 2 of your DON!! cards and this Leader and trash 1 card with a type including "CP" from your hand: Add up to 1 card from the top of your deck to the top of your Life cards.'],
  plain: () => (
    <>
      <p>
        During your Main Phase you can rest two DON!!, rest Spandam himself and trash a CP card from your hand to put the top card of your deck on top of your Life. That
        is one more Life, at the price of a card, two DON!! and the Leader&apos;s attack that turn (a rested Leader cannot attack).
      </p>
      <p>
        So Spandam is a defensive Leader: he trades cards and tempo for Life to outlast an aggressive opponent, and the Life he adds is a real card you can draw later. The
        text has no once-per-turn limit, but needing the Leader to be active to rest him limits it to once a turn in practice.
      </p>
    </>
  ),
  pool: {
    label: "Black or Yellow cards with a CP type",
    test: (c, types) => isColour(c, ["Black", "Yellow"]) && types.some((t) => /\bCP/.test(t)),
  },
  building: () => (
    <>
      <p>
        Every CP card in hand is both a body or an Event and fuel for the Life ability, so the deck runs as many good CP cards as Black and Yellow allow: the CP9
        Characters of OP03, OP07 and OP18 make up most of the table. Yellow brings Trigger effects that reward having Life cards to take, which is where the extra Life pays
        off twice.
      </p>
      {blockOne()}
    </>
  ),
  faq: [
    {
      q: "What does the Spandam OP18 Leader do?",
      a: "In your Main Phase you can rest 2 DON!! and Spandam and trash a CP card from your hand to add the top card of your deck to your Life. It is a defensive Leader that buys Life with cards.",
    },
    { q: "What colour is Spandam OP18-079?", a: "Black and Yellow, with 4 Life and 5000 power as the catalogue lists it." },
  ],
  related: OP18_LINKS,
});

/** The OP18 release-day guides (2026-11-20), newest in the blog list. */
export const OP18_LEADER_POSTS = [frankyOp18, allSundayOp18, spandamOp18];
/** The first round (2026-11-10). */
export const RELEASED_LEADER_POSTS = [sanjiOp12, rosinanteOp12, eggheadLuffySt29, yamatoOp16, moriaOp06];
export const LEADER_GUIDE_POSTS = [...OP18_LEADER_POSTS, ...RELEASED_LEADER_POSTS];
