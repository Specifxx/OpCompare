import Link from "next/link";
import { Callout, CardTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { money } from "../../format";
import type { Post } from "../types";
import { plural } from "../util";
import {
  GUIDE,
  LEADER,
  LeaderTable,
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

// The OP18 green Monkey.D.Luffy Leader (OP18-022), from the owner's growth pack
// (16 October 2026). Sources and the "reported text" rule: ./op18-shared.tsx.
// The pack's open question (which green cards set the Leader active) is
// answered from TCGplayer's pre-release listings (Kokoro, Gonbe, Chimney, Nico
// Robin), quoted as reported; its Franky OP18-034 row is left out (no listing),
// and no decklist is printed until Bandai publishes the set.
const UNTAPPERS = ["OP18-025", "OP18-024", "OP18-028", "OP18-031"];

export const op18GreenLuffy: Post = {
  slug: "op18-green-luffy-leader-deck-guide",
  title: () => "OP18 Green Luffy Leader (OP18-022): Effect and Deck Guide",
  description:
    "The OP18 green Monkey.D.Luffy Leader (OP18-022) explained: its attack-twice effect, the green cards that untap it, how the deck plays and where to pre-order.",
  tags: ["guide", "op18", "leaders", "green"],
  category: "guide",
  date: "2026-10-16",
  minutes: 7,
  faq: [
    {
      q: "What is the OP18 green Luffy leader's card number?",
      a: "OP18-022, as TCGplayer lists it before release: a green Monkey.D.Luffy Leader with 5 Life and 5000 power. Bandai's official card list has no OP18 cards yet. [The Luffy leader page](/leaders/monkey-d-luffy-op18-022) lists every printing as it appears.",
    },
    {
      q: "What does the OP18 Luffy leader effect do?",
      a: "With 3 or more DON!! attached, once per turn when he attacks, you can set him active again so he can attack a second time that turn. If you do, he will not become active in your next Refresh Phase. That is the reported pre-release text; Bandai's final English wording may differ.",
    },
    {
      q: "Which OP18 cards set the Luffy leader active again?",
      a: "On the reported pre-release text: Gonbe (OP18-025) and Kokoro (OP18-024) at the end of your turn, Nico Robin (OP18-031) at the end of your turn through the Water Seven type, and Chimney (OP18-028) in your Main Phase, by resting Gonbe and itself.",
    },
    {
      q: "When does OP18 release in English?",
      a: "Bandai's English product page lists 20 November 2026, at an MSRP of US$4.99 per pack. Bandai's Japanese page dates the Japanese edition 21 November 2026. Pre-order prices are on [the OP18 pre-order board](/op18-preorders).",
    },
    {
      q: "Is green Luffy going to be good?",
      a: "Nobody can say yet: Bandai has not published the full card list and there are no tournament results. On the reported text, green has several cards that untap the Leader, which is what this deck needs. We will update this guide when the final English text is out.",
    },
  ],
  related: [
    { href: leaderPath(LEADER.luffy), label: "Green Luffy leader page" },
    { href: "/sets/op18-the-dominance-of-god", label: "OP18 card list" },
    { href: OP18_PREORDERS, label: "OP18 pre-order prices" },
    { href: "/leaders", label: "Every Leader" },
  ],
  build: ({ cat, sealed, country }) => {
    const c = COUNTRIES[country];
    const set = op18Set(cat);
    const luffy = byNumber(cat, LEADER.luffy.number);
    const leaders = op18Leaders(cat);
    const untappers = cardsOf(cat, UNTAPPERS);
    const card = (n: string) => byNumber(cat, n);
    const manga = cat.cards.find((x) => x.number === "OP18-031" && x.printing === "manga");
    const cheapUntappers = untappers.filter((x) => x.cost != null && x.cost <= 2);
    const fourLife = leaders.filter((l) => l.colors.length > 1 && l.life === 4);
    const franky = leaders.find((l) => l.name === "Franky");
    const setCards = set ? cat.cards.filter((x) => x.setId === set.id).length : 0;
    const pre = !(set?.releasedOn && set.releasedOn <= new Date().toISOString().slice(0, 10));
    const setLink = (text: string) => (set ? <Link href={`/sets/${set.slug}`}>{text}</Link> : <>{text}</>);
    const leaderLink = (text: string) => <Link href={leaderPath(luffy ?? LEADER.luffy)}>{text}</Link>;

    return {
      heroCards: withArt([luffy, ...untappers]),
      summary: [
        <>
          <strong>Monkey.D.Luffy OP18-022</strong> is a mono-green Leader in OP18, The Dominance of God
          {luffy?.life != null && luffy.power != null ? `, with ${luffy.life} Life and ${luffy.power} power` : ""}. Bandai dates the English
          release 20 November 2026.
        </>,
        <>
          With 3 DON!! attached it can set itself active when it attacks, so it <strong>attacks twice in one turn</strong>; the cost is that it stays rested in your
          next Refresh Phase (reported pre-release text).
        </>,
        untappers.length ? (
          <>
            Reported so far, {untappers.length === 1 ? "one green OP18 card sets" : `${untappers.length} green OP18 cards set`} the Leader active again:{" "}
            {andList(untappers.map((x) => x.name))}. That is the answer to the drawback.
          </>
        ) : null,
        luffy?.low[country] != null ? (
          <>
            The cheapest Luffy OP18-022 listing we track in {c.place} today is <strong>{money(luffy.low[country], country)}</strong>
            {pre ? ", a pre-order listing that moves daily." : "."}
          </>
        ) : null,
        <>No decklist yet: Bandai has not published OP18&apos;s card list, and this guide will not guess one.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>OP18, The Dominance of God, brings a brand-new mono-green Monkey.D.Luffy Leader.</strong>{" "}
            {leaders.length ? `It is one of ${plural(leaders.length, "OP18 Leader")} TCGplayer lists so far. ` : ""}This guide covers what the card does, how to think about building around it, and how to get OP18 without
            overpaying.
          </p>
          <ReportedNote />
        </>
      ),
      sections: [
        {
          id: "release",
          title: "OP18 release date and leader list",
          body: (
            <>
              <p>
                Bandai&apos;s English product page lists OP18 for <strong>20 November 2026</strong>, at an MSRP of <strong>US$4.99 per pack</strong>, with
                &ldquo;127+1 types in total&rdquo;. Bandai&apos;s Japanese page dates the Japanese edition 21 November 2026. The set&apos;s themes are the{" "}
                <strong>Water Seven</strong> arc and the <strong>Holy Knights of God</strong>, and Bandai names Saint Gunko and Saint Shamrock as its card game
                debuts. Its cards are tournament legal seven days after release, and at a local store&apos;s pre-release events from the pre-release date.
              </p>
              <p>The Leaders TCGplayer lists for OP18 so far:</p>
              <LeaderTable cat={cat} highlight={LEADER.luffy.number} />
              <p>Full set details: {setLink("the OP18 The Dominance of God card list")}, every card priced as stores list it.</p>
            </>
          ),
        },
        {
          id: "effect",
          title: "What the green Luffy leader does",
          body: (
            <>
              <ReportedCard number={LEADER.luffy.number} name="Monkey.D.Luffy" c={luffy} />
              <p>In plain English:</p>
              <ol>
                <li>
                  Give Luffy at least <strong>3 DON!!</strong>. Each DON!! given adds 1000 power during your turn (Comprehensive Rules 6-5-5-2), so he attacks at
                  8000 or more.
                </li>
                <li>
                  When he attacks, you can <strong>set him active straight away</strong>.
                </li>
                <li>
                  Because he is active again, he can <strong>attack a second time</strong> that turn. Given DON!! stay on him until your next Refresh Phase (6-2-3),
                  so the second attack carries them too.
                </li>
                <li>
                  The price: in your <strong>next</strong> Refresh Phase he does not become active, so by default he cannot attack on your following turn.
                </li>
              </ol>
              <p>
                So the card is a <strong>burst turn</strong>: two Leader attacks in one turn, then a quieter turn. That shapes everything about the deck. The
                bracketed words are explained in <Link href={GUIDE.keywords}>our One Piece keywords guide</Link>.
              </p>
            </>
          ),
        },
        {
          id: "how-it-plays",
          title: "How the deck wants to play",
          body: (
            <>
              <h3>1. Pick your burst turns</h3>
              <p>
                Two Leader attacks at 8000 or more can force your opponent to spend counters twice or take two Life. Do it when they are low on cards in hand, or on
                the turn you need to close the game. If you burst on the wrong turn, you give up your Leader attack on the next turn for nothing.
              </p>
              <h3>2. The green cards that cover the drawback</h3>
              <p>
                Green in the One Piece Card Game has always been the colour of resting your opponent&apos;s cards and setting your own cards and DON!! active. If
                something sets the Leader active again, the &ldquo;does not refresh&rdquo; cost mostly disappears.
                {untappers.length
                  ? ` TCGplayer's pre-release listings already show ${untappers.length === 1 ? "one green OP18 card" : `${untappers.length} green OP18 cards`} that do exactly that (reported text, ${READ_ON}):`
                  : " No such card is in our catalogue yet; this section fills in as OP18 cards are listed."}
              </p>
              {untappers.length ? (
                <ul>
                  {UNTAPPERS.map((n) => {
                    const x = card(n);
                    return x ? (
                      <li key={n}>
                        <ReportedLine number={n} name={x.name} c={x} />
                      </li>
                    ) : null;
                  })}
                </ul>
              ) : null}
              {untappers.length ? (
                <p>
                  Read together: an <strong>[End of Your Turn]</strong> untap happens after your burst, so Luffy goes into your opponent&apos;s turn already active,
                  and the refresh he skips costs nothing unless something rests him again first. Nico Robin works on Luffy because he is a Water Seven card. Chimney
                  is different: it works in your Main Phase, so on the reported text it can untap Luffy in the middle of your turn, and its cost rests Gonbe, which is
                  the condition for Gonbe&apos;s own end-of-turn untap. Treat that as a reading of pre-release text, not a tested line, and check Bandai&apos;s final
                  wording and rulings first.
                </p>
              ) : null}
              <h3>3. {luffy?.life != null ? `${luffy.life} Life` : "Life"} and time</h3>
              <p>
                {luffy?.life === 5 && fourLife.length
                  ? `With 5 Life, Luffy starts one Life higher than the 4-Life multicolour Leaders in this set (${andList(fourLife.map((l) => l.name))}). That extra buffer means you can spend early turns building a board and DON!! instead of racing.`
                  : "A Leader's Life is how many hits it can take; one more ends the game. The more it has, the more early turns you can spend building a board and DON!! instead of racing."}
              </p>
              <h3>4. DON!! budgeting matters</h3>
              <p>
                Three DON!! on the Leader is a real chunk of your DON!! in the mid-game. Expect the deck to want cheap, efficient Characters around it, so the burst
                turn does not leave the board empty.
                {cheapUntappers.length > 1 ? ` The untap cards above help here: ${cheapUntappers.length} of them cost 2 or less.` : ""}
              </p>
            </>
          ),
        },
        {
          id: "cards",
          title: "Cards to watch in OP18",
          body: (
            <>
              {untappers.length ? (
                <>
                  <p>
                    The green OP18 cards above, priced as they are listed today. Before release these are pre-order listings, so treat them as a watchlist, not a
                    valuation:
                  </p>
                  <CardTable cards={untappers} setById={cat.setById} country={country} />
                </>
              ) : null}
              {manga ? (
                <p>
                  TCGplayer also lists a <Link href={`/card/${manga.slug}`}>Manga printing of Nico Robin (OP18-031)</Link>, the same card with manga-panel art.
                </p>
              ) : null}
              <Callout title="No decklist yet">
                Bandai has not published the full OP18 card list, and a 50-card list built on part of a set would be a guess. {setLink("The OP18 card list")}{" "}
                {setCards ? `holds ${plural(setCards, "OP18 printing")} today and ` : ""}fills in as TCGplayer lists more cards.
              </Callout>
            </>
          ),
        },
        {
          id: "vs",
          title: "Green Luffy vs the other OP18 leaders",
          body: (
            <ul>
              {franky ? (
                <li>
                  <strong>
                    vs <Link href={leaderPath(franky)}>Franky</Link> ({colourLabel(franky)}):
                  </strong>{" "}
                  Franky is about Stage cards: on the reported text, Stages in your hand get a +3000 Counter, and he can play a Stage of cost 5 or less for DON!! −1.
                  It is a slower value plan; Luffy is the more direct, attack-focused green option.
                </li>
              ) : null}
              <li>
                <strong>vs Karoo (Red/Blue):</strong>{" "}
                Karoo gives Rush to Characters that are both Animal and Alabasta. It is aggressive from the Character side, while Luffy&apos;s aggression comes
                from the Leader. See our <Link href={GUIDE.karoo}>Karoo leader guide</Link>.
              </li>
              <li>
                <strong>vs Saint Gunko (Purple/Black):</strong>{" "}
                Gunko plays a longer game built on playing Characters from the trash and DON!! ramp. See the{" "}
                <Link href={GUIDE.gunko}>Saint Gunko leader guide</Link>.
              </li>
            </ul>
          ),
        },
        {
          id: "buy",
          title: "Where to buy OP18 for the green Luffy deck",
          body: (
            <ul>
              <li>
                <strong>Pre-orders:</strong> {boxLine(cat, sealed, country)} Bandai&apos;s MSRP is US$4.99 per pack.
              </li>
              <li>
                <strong>The Leader itself:</strong> {cardPrice(cat, luffy, "Luffy OP18-022", country)} {leaderLink("The Luffy leader page")} lists every printing.
              </li>
              <li>
                <strong>Box or singles:</strong> if you only want the green core, singles after release are usually cheaper than chasing them in boxes. Our{" "}
                <Link href="/blog/one-piece-booster-box-prices">booster box prices</Link> and{" "}
                <Link href="/blog/one-piece-set-value-concentration">set value concentration</Link> posts explain when a box is worth it.
              </li>
              <li>
                <strong>Local stores:</strong> browse <Link href="/stores">the stores we track in each market</Link>. Bandai&apos;s page notes OP18 cards are
                legal at a local store&apos;s pre-release events from the pre-release date, a way to try the new Leaders early.
              </li>
              <li>
                <strong>Importing:</strong> sometimes the same box is <Link href="/blog/are-one-piece-cards-cheaper-abroad">cheaper abroad</Link>, even after
                postage.
              </li>
              <li>
                New to Leaders in general? Our <Link href="/blog/cheapest-one-piece-leaders">cheapest leaders</Link> list is a budget starting point.
              </li>
            </ul>
          ),
        },
      ],
    };
  },
};
