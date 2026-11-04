import Link from "next/link";
import { Callout, CardLink, CardTable, SimpleTable } from "@/components/blog/BlogBits";
import { money, pct } from "../../format";
import type { CardLite, SetLite } from "../../data";
import type { Post } from "../types";
import { byMarketDesc, packPullable } from "../util";

// A market-trend post (owner, 2026-11-04: insightful posts on the latest
// trends, the history and where the trajectory goes). The tables are live:
// per-set master-set value and its 30-day change come from the catalogue's
// marketUsd and change30d, the Index from the history branch. The dated
// figures in the prose are from the 4 November 2026 snapshot and say so.
// Nothing here is a price target.
const AS_OF = "4 November 2026";

function setRows(cards: CardLite[], sets: SetLite[]) {
  const now = Date.now();
  return sets
    .filter((s) => ["booster", "extra", "premium"].includes(s.kind) && s.releasedOn && Date.parse(s.releasedOn) <= now)
    .map((s) => {
      const cs = cards.filter((c) => c.setId === s.id && c.marketUsd != null && c.marketUsd > 0).sort(byMarketDesc);
      const total = cs.reduce((t, c) => t + c.marketUsd!, 0);
      // A card's price 30 days ago, from its own 30-day change; cards without one count as unchanged.
      const before = cs.reduce((t, c) => t + (c.change30d == null ? c.marketUsd! : c.marketUsd! / (1 + c.change30d / 100)), 0);
      return { s, n: cs.length, total, change: before ? (total / before - 1) * 100 : null, over100: cs.filter((c) => c.marketUsd! >= 10000).length, top: cs[0] };
    })
    .filter((r) => r.n >= 50 && r.top)
    .sort((a, b) => Date.parse(a.s.releasedOn!) - Date.parse(b.s.releasedOn!));
}

export const marketNovember2026: Post = {
  slug: "one-piece-tcg-market-november-2026",
  title: () => "The One Piece TCG Market in November 2026: Four Years In, Where the Money Went and What OP18 Changes",
  description:
    "The OP Compare Index is down 2% in a month and 20 of 22 booster sets lost value, yet EB05's chase cards rose after release. Four years of One Piece prices, set by set, and what to expect from OP18.",
  tags: ["market", "analysis", "collecting", "op18", "eb05"],
  date: "2026-11-04",
  minutes: 10,
  related: [
    { href: "/market", label: "OP Compare Index" },
    { href: "/movers", label: "Price movers" },
    { href: "/sets/eb-05-extra-booster-one-piece-heroines-edition-vol-2", label: "EB05 cards and prices" },
  ],
  faq: [
    {
      q: "Are One Piece card prices going down in 2026?",
      a: "Across the market, slightly. The OP Compare Index, which tracks the TCGplayer market value of every English card, fell about 2% between 3 October and 4 November 2026, and 20 of the 22 booster, extra and premium sets lost value over those 31 days. The falls were concentrated in regular rares and in sets two or three releases old; the top alternate-art cards moved much less.",
    },
    {
      q: "Which One Piece sets hold their value best?",
      a: "On our data the sets with the most cards worth US$100 or more are the two Premium Boosters, EB02 (Anime 25th Collection), OP13 and OP17: sets built around reprinted chase art and SP cards. Main-set commons, uncommons and regular rares in every set are worth cents within weeks of release.",
    },
    {
      q: "What happens to prices when OP18 releases?",
      a: "OP18 The Dominance of God releases on 20 November 2026 after release events from 13 November. In the last two cycles, the set before the new one lost the most value in the release month, and the new set's chase cards found their level within about two weeks of release while its regular cards fell to under a dollar in days.",
    },
  ],
  build: ({ cat, index }) => {
    const rows = setRows(packPullable(cat), cat.sets);
    const fallers = rows.filter((r) => r.change != null && r.change < 0).length;
    const latest = index[index.length - 1];
    const monthAgo = index.find((p) => Date.parse(p.day) >= Date.parse(latest?.day ?? "2026-11-04") - 30 * 864e5) ?? index[0];
    const indexChange = latest && monthAgo && monthAgo.value ? (latest.value / monthAgo.value - 1) * 100 : null;
    const eb05 = cat.sets.find((s) => s.code === "EB05");
    const eb05Top = eb05 ? cat.cards.filter((c) => c.setId === eb05.id && c.marketUsd).sort(byMarketDesc).slice(0, 8) : [];
    const op17 = cat.sets.find((s) => s.code === "OP17");
    const op17Top = op17 ? cat.cards.filter((c) => c.setId === op17.id && c.marketUsd).sort(byMarketDesc)[0] : undefined;
    const byValue = [...rows].sort((a, b) => b.over100 - a.over100);
    const heroCards = [eb05Top[0], op17Top, byValue[0]?.top].filter((c): c is CardLite => !!c);
    const worst = [...rows].filter((r) => r.change != null).sort((a, b) => a.change! - b.change!).slice(0, 3);
    const best = [...rows].filter((r) => r.change != null).sort((a, b) => b.change! - a.change!).slice(0, 2);

    return {
      heroCards,
      summary: [
        indexChange != null && latest && monthAgo ? (
          <>
            The <Link href="/market">OP Compare Index</Link> moved <strong>{pct(indexChange)}</strong> between {monthAgo.day} and {latest.day}
            {latest.cardCount ? <> across {latest.cardCount.toLocaleString("en-US")} priced cards</> : null}.
          </>
        ) : null,
        <>
          <strong>{fallers} of {rows.length}</strong> booster, extra and premium sets lost TCGplayer market value over the last 30 days
          {worst[0] ? <>; {worst.map((r) => `${r.s.code} ${pct(r.change)}`).join(", ")} fell most</> : null}
          {best[0] && best[0].change! > 0 ? <>, while {best.filter((r) => r.change! > 0).map((r) => `${r.s.code} ${pct(r.change)}`).join(" and ")} rose</> : null}.
        </>,
        <>
          <strong>EB05 (released 30 October) broke the launch pattern:</strong> its ten most valuable cards were worth US$4,287 together on release day and US$5,293 five days later, while its median card fell from US$0.81 to US$0.69.
        </>,
        <>
          The money sits in reprinted chase art, not in new main sets: the sets with the most US$100+ cards are {byValue.slice(0, 3).map((r) => r.s.code).join(", ")}.
        </>,
        <>A snapshot of prices that move daily, not advice. Dated figures are from {AS_OF}.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>The One Piece Card Game is four years old next month.</strong> OP01 Romance Dawn released in English on 2 December 2022, and the game has
            shipped seventeen main boosters, five extra boosters, two Premium Boosters and more than thirty starter decks since. OP Compare has held a daily
            TCGplayer market price for every English card since 3 October 2026, so this is the first time we can show a full month of the market moving set by set,
            rather than describe it. Below: what moved in October, how the game got here, and what the OP18 cycle is likely to do, stated as the pattern the last two
            cycles followed rather than as a forecast.
          </p>
          <p>Every table is live and reprices daily. The numbers in the text were read on {AS_OF}.</p>
        </>
      ),
      sections: [
        {
          id: "the-month",
          title: "October 2026: a market that drifted down, except at the top",
          body: (
            <>
              <p>
                The headline is small and negative. The OP Compare Index, which adds up the TCGplayer market price of one copy of every priced English card and
                rebases it to 1,000 on 3 October, closed 4 November at 978: down 2.2% in a month, with most of the fall in the two weeks around the EB05 release.
                Underneath that, twenty of the twenty-two booster, extra and premium sets lost value, and the losses were not where you might expect.
              </p>
              <SimpleTable
                head={["Set", "Released", "Master set (TCGplayer market)", "30-day change", "Cards US$100+", "Top card"]}
                align={["l", "l", "r", "r", "r", "l"]}
                rows={rows.map((r) => [
                  <Link key="s" href={`/sets/${r.s.slug}`}>
                    {r.s.code}
                  </Link>,
                  r.s.releasedOn!.slice(0, 7),
                  money(r.total, "US"),
                  r.change == null ? "—" : pct(r.change),
                  r.over100.toLocaleString("en-US"),
                  <CardLink key="c" c={r.top!} />,
                ])}
              />
              <p>Three patterns in that table, as of {AS_OF}:</p>
              <ul>
                <li>
                  <strong>The biggest falls were in sets that are two or three releases old.</strong> OP02 Paramount War lost 12.8% of its master-set value, OP08 Two
                  Legends 11.7%, OP17 The World&apos;s Strongest Warriors 9.8% and OP15 Adventure on Kami&apos;s Island 8.6%. OP17 is the most recent main set, and
                  its fall is the ordinary post-launch settling: its top card, Rocks.D.Xebec OP17-118 Super Alternate Art, stayed at US$6,100 all month while the
                  cards under it kept slipping.
                </li>
                <li>
                  <strong>The sets that held or rose are the ones built from reprinted chase art.</strong> EB02 Anime 25th Collection gained 9.4% and Premium
                  Booster Vol. 1 edged up 0.6%. Both are sets whose value is almost entirely SP and Manga prints of cards collectors already wanted, with no
                  commons to drag the total down.
                </li>
                <li>
                  <strong>Cards worth US$100 or more are concentrated in a handful of sets.</strong> Premium Booster Vol. 1 has 27 of them, EB02 23, OP13 and Premium
                  Booster Vol. 2 17 each, OP17 15. OP01, the first set, has 12; OP03, OP04 and OP08 have three or four. A main set is worth, in round numbers,
                  its top five cards.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "eb05",
          title: "EB05: the launch that went the other way",
          body: (
            <>
              <p>
                EB05 Extra Booster: One Piece Heroines Edition Vol. 2 released on 30 October, so the month includes a full launch week. Normally a set&apos;s chase
                cards list high during preorders and fall as product is opened; that is what OP17 did in August and what every main set has done. EB05 did the
                opposite at the top. Its ten most valuable cards added up to US$4,287 at TCGplayer market on release day and US$5,293 five days later, a 23% rise,
                while the median EB05 card went from US$0.81 to US$0.69 and the median cheapest US listing fell from US$0.93 to US$0.25.
              </p>
              <p>
                In other words, the set split in two within a week: the Kentaro Yabuki and gold-stamped illustration cards found buyers faster than stores could
                restock them, and everything else became bulk. The same thing happened to EB03 Heroines Edition Vol. 1 in February, and it is the clearest sign of
                where collector money in this game is going: toward a small number of illustrator-signed, stamped or Manga-style prints, and away from the
                playable chase rares that drove OP01 to OP08. The most valuable EB05 cards today:
              </p>
              {eb05Top.length ? <CardTable cards={eb05Top} setById={cat.setById} country="US" caption="EB05 by TCGplayer market price, live" /> : null}
            </>
          ),
        },
        {
          id: "four-years",
          title: "How the market got here: four years in three phases",
          body: (
            <>
              <p>
                <strong>2022 to 2023: the supply-shock years.</strong> OP01 to OP05 released into an English market that Bandai had not planned for. Boxes sold out on
                preorder, restocks took months, and the Manga and Parallel alternate arts of Shanks, Ace, Law and Zoro from those sets became the game&apos;s blue
                chips. They still are: the top cards of OP01, OP02, OP05 and OP06 are all four-figure Manga prints, and OP01 still has 12 cards over US$100 from a
                156-card set.
              </p>
              <p>
                <strong>2024 to 2025: print runs catch up, Premium Boosters reprint the chase.</strong> From OP06 onward product stayed on shelves, and the master-set
                value of a new main set stopped climbing after release. Premium Booster Vol. 1 (November 2024) and Vol. 2 (October 2025) reprinted the most wanted
                cards from earlier sets in new treatments, and the EB01 and EB02 extra boosters did the same with anime-art and 25th-anniversary prints. The effect
                shows in the table above: those four sets hold more US$100+ cards than any main set, and they are the only sets that gained value this month.
              </p>
              <p>
                <strong>2026: bigger sets, SP and Gold, illustration chases.</strong> OP14 and OP15 shipped with their EB04 half-sets inside (211 and 206 cards), OP13 and
                OP17 introduced the Super Alternate Art tier that now holds the two most expensive cards from a main set (Luffy OP13-118 at US$7,500 and Rocks OP17-118
                at US$6,100), and the Gold-stamped SP prints of Luffy OP05-119 and Teach OP09-093 pushed single cards past US$10,000. The Heroines extra boosters
                added a third kind of chase, the illustrator card, which is what EB05 just demonstrated.
              </p>
              <Callout title="What has not changed">
                The regular versions of a set&apos;s cards, including its leaders and the rares that win tournaments, cost under a dollar within weeks of release in
                every set we have data for. The game is cheap to play and expensive to collect, and the gap between the two has widened every year.
              </Callout>
            </>
          ),
        },
        {
          id: "op18",
          title: "What OP18 is likely to do",
          body: (
            <>
              <p>
                <Link href="/sets/op18-the-dominance-of-god">OP18 The Dominance of God</Link> releases on 20 November 2026, with release events from 13 November. Our{" "}
                <Link href="/blog/op18-chase-cards">OP18 chase cards</Link> post tracks the reveals. Based on the OP17 and EB05 cycles, this is the pattern to expect,
                not a target:
              </p>
              <ol>
                <li>
                  <strong>OP17 falls further in November.</strong> The set before the new one has lost the most value in each release month we can measure. OP17
                  is already down about 10% in October; its regular cards have nowhere to go, so the fall will come from its alternate arts repricing as attention moves.
                </li>
                <li>
                  <strong>OP18&apos;s preorder prices are its highest prices, except at the very top.</strong> Main-set rares and leaders will be under a dollar within
                  days. The Super Alternate Art and Manga tier is the one place EB05&apos;s pattern may repeat, with prices rising for a week or two after release
                  before stock catches up.
                </li>
                <li>
                  <strong>The Index keeps drifting down through December.</strong> A new set adds a few hundred priced cards at launch prices that then fall, and the
                  anniversary period historically brings Premium Booster and promo supply. Expect the Index to lose a few more percent before it finds a floor in the
                  new year, with the old-set Manga prints the part of the market least affected.
                </li>
              </ol>
              <p>
                What would break the pattern: an OP18 leader that defines the format (the OP18 green Luffy and Saint Gunko builds are the candidates, covered in our{" "}
                <Link href="/guides/op18-green-luffy-leader-deck-guide">OP18 green Luffy</Link> and <Link href="/guides/saint-gunko-leader-guide-op18">Saint Gunko</Link> guides), or a short print
                of the kind the market has not seen since OP05.
              </p>
              <p>
                We will update this post after OP18&apos;s first two weeks with the same tables. Until then the live versions are on the{" "}
                <Link href="/market">Index</Link>, the <Link href="/movers">price movers</Link> and each set page.
              </p>
            </>
          ),
        },
      ],
    };
  },
};
