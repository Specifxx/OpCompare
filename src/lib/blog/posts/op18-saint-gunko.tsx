import Link from "next/link";
import { Callout, CardGrid } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { money } from "../../format";
import type { Post } from "../types";
import { plural } from "../util";
import {
  GUIDE,
  HOLY_KNIGHTS,
  LEADER,
  OP18_PREORDERS,
  READ_ON,
  ReportedCard,
  ReportedLine,
  ReportedNote,
  andList,
  boxLine,
  byNumber,
  cardPrice,
  cardsOf,
  colourLabel,
  leaderPath,
  op18Leaders,
  op18Set,
  withArt,
} from "./op18-shared";

// The OP18 Saint Gunko Leader (OP18-060), from the owner's growth pack (16 October
// 2026). Sources and the "reported text" rule: ./op18-shared.tsx. Left out, because
// TCGplayer lists none of them and their numbers were disputed in the pack itself:
// the Gunko and Saint Gunko Characters (OP18-084 / OP18-065), Iceburg (OP18-061)
// and Mini Merry (OP18-078), and the "parallel leader" (TCGplayer lists only the
// standard Leader). Saint Shamrock's text is quoted as reported. The pack's "how
// many Knights of God reach 8000 power" is answered from the catalogue, with the
// correction that the Leader counts ANY Character of 8000 base power.
const KEY_CARDS = ["OP18-119", "OP18-085", "OP18-076"];
const PB = ["Purple", "Black"];

export const op18SaintGunko: Post = {
  slug: "saint-gunko-leader-guide-op18",
  title: () => "Saint Gunko Leader OP18-060: Effect, Deck Plan & Key Cards",
  description:
    "Saint Gunko (OP18-060), the Purple/Black OP18 Leader: how her trash-recursion and DON!! ramp effect works, the key cards, and where to pre-order OP18.",
  tags: ["guide", "op18", "leaders"],
  category: "guide",
  date: "2026-10-16",
  minutes: 7,
  faq: [
    {
      q: "What is the Saint Gunko leader's card number?",
      a: "OP18-060, as TCGplayer lists it before release: a Purple/Black Leader with 4 Life and 5000 power. Bandai's official card list has no OP18 cards yet, so treat pre-release numbers as provisional until it does.",
    },
    {
      q: "What does Saint Gunko's leader effect do?",
      a: "On the reported pre-release text: once per turn, when a Character is played from your trash, you draw 2 cards and trash 1. Also once per turn in your Main Phase, you may trash a card from your hand; if you have a Character with 8000 base power or more, you add an active DON!! from your DON!! deck.",
    },
    {
      q: "Does Saint Shamrock count for Saint Gunko's DON!! ability?",
      a: "On the reported text, yes: Saint Shamrock (OP18-119) has 9000 power, and the Leader asks for a Character with 8000 base power or more. Base power is the number printed on the card (Comprehensive Rules 4-9-2), so temporary boosts do not count.",
    },
    {
      q: "Is there an alternate-art Saint Gunko leader?",
      a: "Not confirmed. On 16 October 2026 TCGplayer listed only the standard Saint Gunko Leader, and Bandai had not published the OP18 card list. [The OP18 card list](/sets/op18-the-dominance-of-god) shows every printing, priced, as it is added.",
    },
    {
      q: "When does Saint Gunko release?",
      a: "With OP18 The Dominance of God, which Bandai's English product page dates 20 November 2026 (21 November 2026 for the Japanese edition). Pre-order prices are on [the OP18 pre-order board](/op18-preorders).",
    },
  ],
  related: [
    { href: leaderPath(LEADER.gunko), label: "Saint Gunko leader page" },
    { href: "/sets/op18-the-dominance-of-god", label: "OP18 card list" },
    { href: OP18_PREORDERS, label: "OP18 pre-order prices" },
    { href: "/keywords/activate-main", label: "Every card with [Activate: Main]" },
  ],
  build: ({ cat, sealed, country }) => {
    const c = COUNTRIES[country];
    const set = op18Set(cat);
    const gunko = byNumber(cat, LEADER.gunko.number);
    const gunkoPrints = cat.cards.filter((x) => x.number === LEADER.gunko.number && x.cardType === "Leader");
    const key = cardsOf(cat, KEY_CARDS);
    const shamrock = byNumber(cat, "OP18-119");
    const knights = cardsOf(cat, HOLY_KNIGHTS);
    const bigKnights = knights.filter((x) => (x.power ?? 0) >= 8000);
    // Purple/black Characters of 8000+ printed power, one per card number: every one meets the DON!! half.
    const bigNumbers = new Set(
      cat.cards
        .filter((x) => x.cardType === "Character" && x.number && (x.power ?? 0) >= 8000 && x.colors.length && x.colors.every((col) => PB.includes(col)))
        .map((x) => x.number!),
    );
    const leaders = op18Leaders(cat);
    const spandam = leaders.find((l) => l.name === "Spandam");
    const franky = leaders.find((l) => l.name === "Franky");
    const pre = !(set?.releasedOn && set.releasedOn <= new Date().toISOString().slice(0, 10));
    const leaderLink = (text: string) => <Link href={leaderPath(gunko ?? LEADER.gunko)}>{text}</Link>;
    const setLink = (text: string) => (set ? <Link href={`/sets/${set.slug}`}>{text}</Link> : <>{text}</>);

    return {
      heroCards: withArt([gunko, shamrock]),
      summary: [
        <>
          <strong>Saint Gunko, OP18-060,</strong> is a Purple/Black Leader in OP18, The Dominance of God
          {gunko?.life != null && gunko.power != null ? `, with ${gunko.life} Life and ${gunko.power} power` : ""}; Bandai names her
          and Saint Shamrock as the set&apos;s debuts.
        </>,
        <>
          Reported text: <strong>draw 2, trash 1</strong> when a Character is played from your trash, and <strong>an extra active DON!!</strong> for a card from
          hand while you have a Character of 8000 base power or more.
        </>,
        shamrock ? (
          <>
            Saint Shamrock (OP18-119{shamrock.rarity ? `, ${shamrock.rarity}` : ""}) is the card to watch: {shamrock.power != null ? `${shamrock.power} power, ` : ""}
            and on its reported text it plays itself back from the trash.
          </>
        ) : null,
        gunko?.low[country] != null ? (
          <>
            The cheapest Saint Gunko OP18-060 listing we track in {c.place} today is <strong>{money(gunko.low[country], country)}</strong>
            {pre ? ", a pre-order listing that moves daily." : "."}
          </>
        ) : null,
        <>No decklist yet: Bandai has not published OP18&apos;s card list.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>Saint Gunko is one of the Holy Knights of God.</strong> She makes her One Piece Card Game debut in <strong>OP18 The Dominance of God</strong>{" "}
            as a <strong>Purple/Black Leader</strong>, and Bandai&apos;s OP18 product page names her and Saint Shamrock as the set&apos;s debuts. This guide
            covers what the Leader does, how the two halves of her effect work together, and the cards worth watching.
          </p>
          <ReportedNote />
        </>
      ),
      sections: [
        {
          id: "details",
          title: "Saint Gunko card details",
          body: (
            <>
              <ReportedCard number={LEADER.gunko.number} name="Saint Gunko" c={gunko} />
              <p>
                {gunkoPrints.length
                  ? `TCGplayer lists ${plural(gunkoPrints.length, "printing")} of the Saint Gunko Leader so far${gunkoPrints.length === 1 ? ", the standard one; an alternate art would appear here and on the leader page once it is listed" : ""}.`
                  : "The Saint Gunko Leader is not in our catalogue yet."}{" "}
                {spandam ? `Some early lists put Spandam at OP18-060; TCGplayer has Saint Gunko there and Spandam, the set's ${colourLabel(spandam)} Leader, at ${spandam.number}. Bandai's own list will settle it.` : ""}
              </p>
            </>
          ),
        },
        {
          id: "effect",
          title: "What the effect means in plain English",
          body: (
            <>
              <h3>Half 1: playing from the trash draws cards</h3>
              <p>
                Whenever a Character is played <strong>from your trash</strong> (not from your hand), you <strong>draw 2 and trash 1</strong>. That improves your
                hand, and the card you trash can be another target to bring back later. It is once per turn, so one well-timed trash play a turn is what you aim
                for.
              </p>
              <h3>Half 2: big bodies give you extra DON!!</h3>
              <p>
                In your Main Phase you may trash a card from your hand. If you control a Character with <strong>8000 or more base power</strong>, you also add an{" "}
                <strong>active DON!!</strong> from your DON!! deck. &ldquo;Base&rdquo; power is the number printed on the card (Comprehensive Rules 4-9-2), so
                temporary boosts do not count. <Link href="/keywords/activate-main">[Activate: Main]</Link> means you choose when, in your Main Phase and not during
                a battle; <Link href={GUIDE.keywords}>our keywords guide</Link> explains every bracket.
              </p>
              <h3>Why the two halves fit together</h3>
              <ul>
                <li>The cards you <strong>trash</strong> with both halves fill your trash with Characters to bring back.</li>
                <li>The <strong>extra DON!!</strong> pays for bigger plays sooner.</li>
                <li>The <strong>draw</strong> keeps your hand stocked, because the DON!! half costs a card every time you use it.</li>
              </ul>
              <p>
                <strong>The trap:</strong> the DON!! half takes its card from your hand whether or not you have an 8000-power Character out, and without a trash play
                that turn there is no draw to make up for it. Trash too eagerly and you run out of plays.
              </p>
            </>
          ),
        },
        {
          id: "colours",
          title: "Why Purple/Black?",
          body: (
            <ul>
              <li>
                <strong>Purple</strong> is the DON!! colour, with effects that add, return and spend DON!!. That suits the Leader&apos;s ramp half.
              </li>
              <li>
                <strong>Black</strong> has long leaned on the trash and on cost-based removal. That suits the recursion half.
              </li>
            </ul>
          ),
        },
        {
          id: "cards",
          title: "Key cards to watch (reported, not final)",
          body: key.length ? (
            <>
              <p>The OP18 cards TCGplayer lists so far that matter most to this Leader, with their reported text ({READ_ON}):</p>
              <ul>
                {KEY_CARDS.map((n) => {
                  const x = byNumber(cat, n);
                  return x ? (
                    <li key={n}>
                      <ReportedLine number={n} name={x.name} c={x} />
                      {n === "OP18-119"
                        ? " At 9000 printed power it meets the Leader's 8000 condition by itself, and both of its abilities play a Character from the trash, which is the Leader's draw trigger (once per turn)."
                        : n === "OP18-085"
                          ? " Cheap support for Saint Shamrock: [Rush] lets it attack the turn it lands, and [Unblockable] gets it past a Blocker."
                          : n === "OP18-076"
                            ? ` A purple Stage that draws and adds a DON!!${franky ? `; typed Straw Hat Crew, it suits the ${colourLabel(franky)} Franky Leader's Stage deck as much as this one` : ""}.`
                            : ""}
                    </li>
                  ) : null;
                })}
              </ul>
              <CardGrid cards={key} setById={cat.setById} country={country} caption="Priced as listed today (pre-release listings move daily)" />
              <h3>What to watch for</h3>
              <ul>
                <li>
                  <strong>Which Characters reach 8000 base power?</strong> The Leader&apos;s condition counts any Character you control, not only Holy Knights of
                  God.
                  {knights.length
                    ? ` Of the ${plural(knights.length, "Holy Knights of God Character")} TCGplayer typed for OP18 on ${READ_ON} (${andList(knights.map((x) => x.name))}), ${bigKnights.length ? `${bigKnights.length < knights.length ? "only " : ""}${andList(bigKnights.map((x) => x.name))} ${bigKnights.length === 1 ? "has" : "have"}` : "none has"} 8000 power or more.`
                    : ""}
                  {bigNumbers.size
                    ? ` Across every set, ${plural(bigNumbers.size, "purple or black Character card number")} in our catalogue ${bigNumbers.size === 1 ? "has" : "have"} 8000 printed power or more, before checking each for Standard legality.`
                    : ""}
                </li>
                <li>
                  <strong>The rest of the Holy Knights of God.</strong> Only part of OP18 is listed. How many other cards play Characters from the trash decides how
                  often the draw fires; {setLink("the OP18 card list")} fills in as cards are listed.
                </li>
              </ul>
            </>
          ) : (
            <p>None of the OP18 cards this guide follows is in our catalogue yet; {setLink("the OP18 card list")} fills in as TCGplayer lists them.</p>
          ),
        },
        {
          id: "turn",
          title: "How a Saint Gunko turn might look",
          body: (
            <>
              <p>
                <em>Illustrative only: a reading of reported pre-release text, not a tested line.</em>
              </p>
              <ol>
                <li>Early turns: use the Leader&apos;s Activate: Main to trash cards you want back later, and build your board.</li>
                <li>
                  Get a Character of 8000 or more base power out{shamrock ? ` (Saint Shamrock, cost ${shamrock.cost ?? "8"})` : ""}. From then on the same ability adds an
                  active DON!! once a turn, for a card from your hand, keeping you a turn ahead on resources.
                </li>
                <li>
                  Play Characters from the trash: on the reported text, Saint Shamrock returns itself from the trash when it is K.O.&apos;d (for a card from your
                  hand), and on a turn it was played it can play a Holy Knights of God Character of cost 6 or less from your trash. Each trash play can trigger the
                  Leader&apos;s draw 2, trash 1, once per turn.
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
          title: "Saint Gunko vs the other OP18 leaders",
          body: (
            <ul>
              <li>
                <strong>
                  <Link href={GUIDE.luffy}>Green Luffy</Link>
                </strong>{" "}
                is about attacking: his Leader can attack twice in one turn. Gunko is a resource engine.
              </li>
              <li>
                <strong>
                  <Link href={GUIDE.karoo}>Karoo</Link>
                </strong>{" "}
                is Rush aggro. Gunko is the slower, value-grinding counterpart.
              </li>
              {spandam ? (
                <li>
                  <strong>
                    <Link href={leaderPath(spandam)}>Spandam</Link> ({colourLabel(spandam)})
                  </strong>{" "}
                  shares black but, on its reported text, spends CP cards to add to its Life.
                </li>
              ) : null}
            </ul>
          ),
        },
        {
          id: "buy",
          title: "Where to buy Saint Gunko and OP18",
          body: (
            <ul>
              <li>
                <strong>Pre-order boxes:</strong> {boxLine(cat, sealed, country)} Bandai&apos;s MSRP is US$4.99 per pack.
              </li>
              <li>
                <strong>The Leader:</strong> {cardPrice(cat, gunko, "Saint Gunko OP18-060", country)} {leaderLink("The Saint Gunko leader page")} lists every
                printing.
              </li>
              <li>
                <strong>Chase cards:</strong> {setLink("the OP18 card list")} prices every printing as it is listed, and our{" "}
                <Link href="/blog/op17-worlds-strongest-warriors-chase-cards">OP17 chase cards</Link> review shows where the value sat in the last set.
              </li>
              <li>
                <strong>Rarity guide:</strong> unsure what SR, SEC or a parallel is? Read{" "}
                <Link href="/guides/one-piece-card-rarities-explained">One Piece card rarities explained</Link>.
              </li>
              <li>
                <strong>Stores:</strong> see <Link href="/stores">the stores directory</Link> for the retailers we track in each market.
              </li>
            </ul>
          ),
        },
      ],
    };
  },
};
