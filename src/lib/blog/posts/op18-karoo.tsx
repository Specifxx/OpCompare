import Link from "next/link";
import { Callout, CardTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { money } from "../../format";
import type { Post } from "../types";
import { plural } from "../util";
import {
  ANIMAL_ALABASTA,
  GUIDE,
  LEADER,
  LeaderTable,
  OP18_PREORDERS,
  READ_ON,
  ReportedCard,
  ReportedLine,
  ReportedNote,
  boxLine,
  byNumber,
  cardPrice,
  cardsOf,
  leaderPath,
  op18Leaders,
  op18Set,
  withArt,
} from "./op18-shared";

// The OP18 Karoo Leader (OP18-001), from the owner's growth pack (16 October 2026).
// Sources and the "reported text" rule: ./op18-shared.tsx. The pack's two open
// questions (how many Characters are typed both Animal and Alabasta) are answered
// from TCGplayer's type data (ANIMAL_ALABASTA, each shown only when the catalogue
// holds it, priced live), with Bandai's Block Number rule beside it
// (en.onepiece-cardgame.com/topics/013.php); its guessed leader URL is the
// route's own slug; no decklist is printed until Bandai publishes the set.

export const op18Karoo: Post = {
  slug: "karoo-leader-guide-op18",
  title: () => "Karoo Leader OP18-001: Effect, Deck Plan & Where to Buy",
  description:
    "Karoo (Carue) is a Red/Blue OP18 Leader that gives Animal and Alabasta Characters Rush. What the effect does, the cards it wants, and where to buy OP18.",
  tags: ["guide", "op18", "leaders"],
  category: "guide",
  date: "2026-10-16",
  minutes: 6,
  faq: [
    {
      q: "Is it Karoo or Carue?",
      a: "They are the same character, Vivi's duck. Karoo is the spelling on TCGplayer and in our catalogue, some card lists spell it Carue, and the Japanese name is カルー. The OP18 Leader is OP18-001; [the Karoo leader page](/leaders/karoo-op18-001) lists every printing.",
    },
    {
      q: "What colour is the Karoo leader?",
      a: "Red and blue, with 4 Life and 5000 power, as TCGplayer lists it before release. A Karoo deck can use red and blue cards; Bandai's official card list has no OP18 cards yet.",
    },
    {
      q: "Which characters get Rush from Karoo?",
      a: "Only your Characters with both the Animal and the Alabasta type, on the reported pre-release text. They also get +1000 power. A Character with only one of the two types gets neither.",
    },
    {
      q: "When can I get the Karoo leader?",
      a: "With OP18, which Bandai's English product page dates 20 November 2026. Pre-order prices for boxes and packs are on [the OP18 pre-order board](/op18-preorders), cheapest first in your currency.",
    },
  ],
  related: [
    { href: leaderPath(LEADER.karoo), label: "Karoo leader page" },
    { href: "/sets/op18-the-dominance-of-god", label: "OP18 card list" },
    { href: OP18_PREORDERS, label: "OP18 pre-order prices" },
    { href: "/keywords/rush", label: "Every card with [Rush]" },
  ],
  build: ({ cat, sealed, country }) => {
    const c = COUNTRIES[country];
    const set = op18Set(cat);
    const karoo = byNumber(cat, LEADER.karoo.number);
    const pool = cardsOf(cat, ANIMAL_ALABASTA);
    const poolColours = [...new Set(pool.flatMap((x) => x.colors))];
    const op04 = pool.filter((x) => x.number?.startsWith("OP04-"));
    const alabasta = ["OP18-016", "OP18-017"].map((n) => ({ n, x: byNumber(cat, n) })).filter((r) => r.x);
    const leaders = op18Leaders(cat);
    const allSunday = leaders.find((l) => l.number === "OP18-041");
    const luffy = leaders.find((l) => l.number === LEADER.luffy.number);
    const pre = !(set?.releasedOn && set.releasedOn <= new Date().toISOString().slice(0, 10));
    const leaderLink = (text: string) => <Link href={leaderPath(karoo ?? LEADER.karoo)}>{text}</Link>;

    return {
      // The Leader and the OP18 cards it is about; an older Karoo's art would pass for the new Leader.
      heroCards: withArt([karoo, ...pool.filter((x) => set && x.setId === set.id)]),
      summary: [
        <>
          <strong>Karoo (also spelled Carue), OP18-001,</strong> is a Red/Blue Leader in OP18, The Dominance of God
          {karoo?.life != null && karoo.power != null ? `, with ${karoo.life} Life and ${karoo.power} power` : ""}.
        </>,
        <>
          Reported text: your Characters typed <strong>both Animal and Alabasta</strong> gain [Rush] and +1000 power; once per turn, when an Alabasta Character is
          K.O.&apos;d, you draw a card.
        </>,
        pool.length ? (
          <>
            {plural(pool.length, "Character card number")} in our catalogue {pool.length === 1 ? "is" : "are"} typed both Animal and Alabasta
            {poolColours.length === 1 ? `, every one ${poolColours[0].toLowerCase()}` : ""}: that pool is the deck&apos;s engine.
          </>
        ) : null,
        karoo?.low[country] != null ? (
          <>
            The cheapest Karoo OP18-001 listing we track in {c.place} today is <strong>{money(karoo.low[country], country)}</strong>
            {pre ? ", a pre-order listing that moves daily." : "."}
          </>
        ) : null,
        <>No decklist yet: Bandai has not published OP18&apos;s card list.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>Vivi&apos;s Super Spot-Billed Duck finally has his own Leader.</strong> Karoo is a <strong>Red/Blue</strong> Leader from{" "}
            <strong>OP18 The Dominance of God</strong>, out 20 November 2026 in English, by Bandai&apos;s product page. Some sites spell his name{" "}
            <strong>Carue</strong>, and the Japanese name is カルー; both refer to the same character. This guide covers what Karoo does, the kind of deck he
            leads, and what to watch as the rest of OP18 is revealed.
          </p>
          <ReportedNote />
        </>
      ),
      sections: [
        {
          id: "details",
          title: "Karoo card details",
          body: <ReportedCard number={LEADER.karoo.number} name="Karoo" c={karoo} />,
        },
        {
          id: "effect",
          title: "What the effect means in plain English",
          body: (
            <>
              <h3>Part 1: Rush for Animal and Alabasta Characters</h3>
              <p>
                <Link href="/keywords/rush">[Rush]</Link> lets a Character attack the turn it is played (Comprehensive Rules 10-1-1-1); normally a new Character
                has to wait a turn (3-7-4). Under Karoo, any Character that is <strong>both</strong> Animal <strong>and</strong> Alabasta comes down swinging, with
                an extra 1000 power on top. Every keyword is explained in <Link href={GUIDE.keywords}>our keywords guide</Link>.
              </p>
              <p>
                The key word is <strong>both</strong>. An Alabasta human does not get Rush, and neither does an Animal from another crew, so deckbuilding comes
                down to how many dual-typed Characters exist.
                {pool.length
                  ? ` In TCGplayer's type data as our catalogue held it on ${READ_ON}, ${plural(pool.length, "Character card number")} ${pool.length === 1 ? "is" : "are"} typed both Animal and Alabasta${poolColours.length === 1 ? `, every one ${poolColours[0].toLowerCase()}` : ""}:`
                  : " None is in our catalogue yet; this section fills in as they are listed."}
              </p>
              {pool.length ? <CardTable cards={pool} setById={cat.setById} country={country} caption="Characters typed both Animal and Alabasta (one printing per card number)" /> : null}
              {pool.length ? (
                <p>
                  Two checks before you build. TCGplayer&apos;s types can differ from the printed card, so read each card&apos;s type line. And Bandai&apos;s
                  Standard Regulation (from 1 April 2026) uses the Block Number printed on each card: from April 2026 to March 2027, Block 1 cards (booster packs 1
                  to 4) are not allowed unless Bandai has updated that card&apos;s Block Number
                  {op04.length ? `, which matters for the ${op04.length === 1 ? "OP04 Character" : `${op04.length} OP04 Characters`} above` : ""}. Check the
                  printed Block Number, and Bandai&apos;s list of updates, before you build for a Standard event.
                </p>
              ) : null}
              <h3>Part 2: Card draw when Alabasta Characters go down</h3>
              <p>
                Once per turn, when <strong>any</strong> of your Alabasta Characters is K.O.&apos;d, you draw a card. This part only needs the Alabasta type, not
                both. It softens trades: if your opponent removes a Rush attacker, you replace it.
              </p>
              <h3>How the two parts fit together</h3>
              <p>
                Karoo&apos;s plan is simple. Play Animal/Alabasta Characters that hit straight away with extra power. Force your opponent to deal with them.
                Refill your hand when they are K.O.&apos;d. That is a classic aggressive shape: pressure early, then draw so you do not run out of cards.
              </p>
            </>
          ),
        },
        {
          id: "colours",
          title: "Why Red/Blue?",
          body: (
            <ul>
              <li>
                <strong>Red</strong> in the One Piece Card Game typically brings power boosts and removal by power, which helps Rush attackers trade well.
              </li>
              <li>
                <strong>Blue</strong> typically brings card draw, hand filtering and bounce (returning cards to the hand). Bounce can clear blockers before your
                Rush Characters attack.
              </li>
            </ul>
          ),
        },
        {
          id: "checklist",
          title: "Building around Karoo: a checklist",
          body: (
            <>
              <p>Until the full card list lands, use this checklist instead of a decklist:</p>
              <ol>
                <li>
                  <strong>Count your dual-typed bodies.</strong> The deck lives or dies on how many good Animal and Alabasta Characters exist
                  {pool.length ? `; the table above lists the ${plural(pool.length, "card number")} we know of` : ""}.{" "}
                  {leaderLink("The Karoo leader page")} also lists the red and blue cards that share either of his types.
                </li>
                <li>
                  <strong>Fill the curve with Alabasta Characters.</strong> Even without Rush, they turn on the draw when K.O.&apos;d.
                  {alabasta.length ? " OP18 adds Alabasta Characters that are not Animals (reported text):" : ""}
                  {alabasta.length ? (
                    <ul>
                      {alabasta.map(({ n, x }) => (
                        <li key={n}>
                          <ReportedLine number={n} name={x!.name} c={x} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
                <li>
                  <strong>Pack counters.</strong>{" "}
                  {karoo?.life != null && luffy?.life != null && karoo.life < luffy.life ? (
                    <>
                      With {karoo.life} Life, Karoo has less buffer than a {luffy.life}-Life Leader like <Link href={GUIDE.luffy}>OP18 green Luffy</Link>.{" "}
                    </>
                  ) : null}
                  Character Counter values and Counter events matter.
                </li>
                <li>
                  <strong>Add blue removal or bounce for blockers.</strong> Rush Characters are only scary if they can connect.
                </li>
                <li>
                  <strong>Watch the once-per-turn limit.</strong> The draw fires once per turn, so do not over-commit expecting several draws.
                </li>
              </ol>
              <Callout title="No decklist yet">
                A sample list waits for Bandai&apos;s full OP18 card list and the first results. Until then, any 50-card list would be a guess.
              </Callout>
            </>
          ),
        },
        {
          id: "vs",
          title: "Karoo vs the other OP18 leaders",
          body: (
            <>
              <LeaderTable cat={cat} highlight={LEADER.karoo.number} />
              <p>
                {allSunday ? (
                  <>
                    <Link href={leaderPath(allSunday)}>{allSunday.name}</Link> is worth a look if you like Karoo&apos;s draw-on-K.O. idea but prefer a slower
                    Baroque Works shell.{" "}
                  </>
                ) : null}
                The other two Leaders with guides: <Link href={GUIDE.luffy}>green Luffy</Link>, whose Leader attacks twice in a turn, and{" "}
                <Link href={GUIDE.gunko}>Saint Gunko</Link>, a slower engine built on the trash.
              </p>
            </>
          ),
        },
        {
          id: "buy",
          title: "Where to buy Karoo and OP18",
          body: (
            <ul>
              <li>
                <strong>The Leader card:</strong> Karoo is an OP18 card{karoo?.rarity ? ` (rarity ${karoo.rarity})` : ""}, so it comes from OP18 booster packs. {cardPrice(cat, karoo, "Karoo OP18-001", country)}{" "}
                {leaderLink("The Karoo leader page")} shows the cheapest copy of every printing as they are listed.
              </li>
              <li>
                <strong>Booster boxes:</strong> {boxLine(cat, sealed, country)} Bandai&apos;s MSRP is US$4.99 per pack.
              </li>
              <li>
                <strong>Set overview:</strong>{" "}
                {set ? <Link href={`/sets/${set.slug}`}>OP18 The Dominance of God</Link> : "OP18 The Dominance of God"}, every card priced as it is listed.
              </li>
              <li>
                <strong>Local game stores:</strong> find one on <Link href="/stores">our stores directory</Link>. A pre-release event is a way to try Karoo before
                buying in.
              </li>
              <li>
                <strong>Budget:</strong> read <Link href="/blog/cheapest-one-piece-leaders">the cheapest One Piece leaders</Link> and{" "}
                <Link href="/guides/where-to-buy-one-piece-cards">where to buy One Piece cards</Link> before paying full pre-order prices.
              </li>
            </ul>
          ),
        },
      ],
    };
  },
};
