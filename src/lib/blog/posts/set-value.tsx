import Link from "next/link";
import { CardTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { longDate, money } from "../../format";
import type { Post } from "../types";
import { byMarketDesc, plural } from "../util";
import { CardLink, PrintingTable, boxSentence, cardName, empty, setByCode, setCards } from "./set-reveal-shared";

// "<set> most valuable cards" for the released booster, extra and premium sets
// (owner, 29 October 2026: RiftCompare's Google traffic comes from set and
// chase-card searches, so every released set gets one). The same shape as
// op17MostValuable, with the set's Manga, SP, Treasure Rare and Leader printings
// as their own sections. Every card, count and price is the catalogue's at render
// time; nothing is typed but the set's code, name and slug. Links to other posts
// are literal paths (this file is imported by lib/blog/index.ts).

export interface SetValueSpec {
  /** The catalogue's set code (TCGplayer's, e.g. "OP15-EB04"). */
  code: string;
  /** The code readers search for ("OP15"). */
  short: string;
  slug: string;
  /** Its URL, written out: every set-value post is a blog post (lib/blog/index.ts postHref, which imports this file). */
  path: string;
  date: string;
  /** Bandai's English name, for the static description. */
  name: string;
  /** Booster, extra booster or premium booster, for the copy. */
  kind: "booster" | "extra" | "premium";
  /** One sentence about how TCGplayer files the set, when it surprises readers. */
  note?: string;
}

export const SET_VALUE_SPECS: SetValueSpec[] = [
  { note: "TCGplayer lists the EB04 cards found in these packs under the same set, so some card numbers below start with EB04.", code: "OP15-EB04", short: "OP15", slug: "op15-most-valuable-cards", path: "/blog/op15-most-valuable-cards", date: "2026-10-29", name: "Adventure on Kami's Island", kind: "booster" },
  { note: "TCGplayer lists the EB04 cards found in these packs under the same set, so some card numbers below start with EB04.", code: "OP14-EB04", short: "OP14", slug: "op14-most-valuable-cards", path: "/blog/op14-most-valuable-cards", date: "2026-10-29", name: "The Azure Sea's Seven", kind: "booster" },
  { code: "OP13", short: "OP13", slug: "op13-most-valuable-cards", path: "/blog/op13-most-valuable-cards", date: "2026-10-29", name: "Carrying On His Will", kind: "booster" },
  { code: "OP12", short: "OP12", slug: "op12-most-valuable-cards", path: "/blog/op12-most-valuable-cards", date: "2026-10-29", name: "Legacy of the Master", kind: "booster" },
  { code: "OP11", short: "OP11", slug: "op11-most-valuable-cards", path: "/blog/op11-most-valuable-cards", date: "2026-10-29", name: "A Fist of Divine Speed", kind: "booster" },
  { code: "OP10", short: "OP10", slug: "op10-most-valuable-cards", path: "/blog/op10-most-valuable-cards", date: "2026-10-29", name: "Royal Blood", kind: "booster" },
  { code: "OP09", short: "OP09", slug: "op09-most-valuable-cards", path: "/blog/op09-most-valuable-cards", date: "2026-10-29", name: "Emperors in the New World", kind: "booster" },
  { code: "EB03", short: "EB03", slug: "eb03-most-valuable-cards", path: "/blog/eb03-most-valuable-cards", date: "2026-10-29", name: "Extra Booster: One Piece Heroines Edition", kind: "extra" },
  { code: "EB02", short: "EB02", slug: "eb02-most-valuable-cards", path: "/blog/eb02-most-valuable-cards", date: "2026-10-29", name: "Extra Booster: Anime 25th Collection", kind: "extra" },
  { code: "EB01", short: "EB01", slug: "eb01-most-valuable-cards", path: "/blog/eb01-most-valuable-cards", date: "2026-10-29", name: "Extra Booster: Memorial Collection", kind: "extra" },
  { code: "PRB-02", short: "PRB02", slug: "prb02-most-valuable-cards", path: "/blog/prb02-most-valuable-cards", date: "2026-10-29", name: "Premium Booster: The Best Vol. 2", kind: "premium" },
  { code: "PRB-01", short: "PRB01", slug: "prb01-most-valuable-cards", path: "/blog/prb01-most-valuable-cards", date: "2026-10-29", name: "Premium Booster: The Best", kind: "premium" },
];

const KIND_WORD = { booster: "booster set", extra: "Extra Booster", premium: "Premium Booster" } as const;

export function setMostValuable(spec: SetValueSpec): Post {
  const { code, short, slug, date, name, kind } = spec;
  // The neighbouring sets' posts, for "read next": the one before and after in SET_VALUE_SPECS.
  const i = SET_VALUE_SPECS.findIndex((s) => s.slug === slug);
  const neighbours = [SET_VALUE_SPECS[i - 1], SET_VALUE_SPECS[i + 1]].filter(Boolean);
  return {
    slug,
    title: () => `${short} Most Valuable Cards: Top 20 One Piece Cards by Price`,
    description: `The 20 most valuable cards in One Piece ${short} ${name}, from live TCGplayer and store prices: Manga Rares, SPs, alt arts and Leaders.`,
    tags: [short.toLowerCase(), "chase cards", "most valuable", "market"],
    date,
    minutes: 6,
    faq: [
      {
        q: `What is the most expensive ${short} card?`,
        a: `The first row of the top-20 table on this page. It is read from TCGplayer's market price every time the page is built, so it is always current rather than a figure typed on the day we wrote it.`,
      },
      {
        q: `Which ${short} cards are Manga Rares and SPs?`,
        a: `Every Manga and SP printing TCGplayer lists under ${short} has its own section on this page, with its price. TCGplayer files some SP reprints of older cards under the set whose packs they are pulled from, so a few card numbers belong to other sets.`,
      },
      {
        q: `Is a ${short} booster box worth opening?`,
        a: `For a specific card, buying it single is almost always cheaper: most of the set's value sits in a handful of printings and most boxes contain none of them. Open a box for the fun of opening. The box section on this page shows today's cheapest box in your market.`,
      },
      {
        q: `Why is my ${short} card worth less than this page says?`,
        a: `The price here is for the exact printing in the row (standard, alt art, Manga or SP) in near-mint condition. The same card number exists in several printings with very different prices, so check the variant and the card number before comparing.`,
      },
    ],
    related: [
      { href: "/sets", label: "Every set" },
      { href: "/tools/box-ev", label: "Box EV calculator" },
      { href: "/blog/most-expensive-one-piece-cards", label: "Most expensive cards" },
    ],
    build: ({ cat, sealed, country }) => {
      const set = setByCode(cat, code);
      if (!set) return empty(short);
      const m = COUNTRIES[country];
      const cards = setCards(cat, set);
      const valued = cards.filter((c) => c.marketUsd != null && c.printing !== "promo").sort(byMarketDesc);
      const top = valued.slice(0, 20);
      const total = valued.reduce((a, c) => a + c.marketUsd!, 0);
      const topSum = top.reduce((a, c) => a + c.marketUsd!, 0);
      const manga = valued.filter((c) => c.printing === "manga");
      const sp = valued.filter((c) => c.printing === "sp");
      const treasure = valued.filter((c) => c.printing === "treasure");
      const alt = valued.filter((c) => c.printing === "alt");
      const leaders = valued.filter((c) => c.cardType === "Leader" && c.printing === "standard");
      const under1 = valued.filter((c) => c.marketUsd! < 100).length;
      const top1 = top[0];
      const setHref = `/sets/${set.slug}`;
      return {
        heroCards: top.filter((c) => c.hasImage).slice(0, 3),
        summary: [
          top1 ? (
            <>
              <strong>Most valuable {short} card:</strong> <CardLink c={top1} /> ({top1.number}) at {money(top1.marketUsd, "US")} on TCGplayer.
            </>
          ) : null,
          total ? (
            <>
              <strong>The top 20 hold {Math.round((topSum / total) * 100)}%</strong> of the set&apos;s value ({money(total, "US")} across{" "}
              {plural(valued.length, "priced printing")}).
            </>
          ) : null,
          manga.length ? (
            <>
              <strong>{plural(manga.length, "Manga Rare")}</strong>
              {manga.length > 1 ? `, the dearest ${cardName(manga[0])}` : `: ${cardName(manga[0])}`} at {money(manga[0].marketUsd, "US")}.
            </>
          ) : null,
          <>
            {plural(under1, "printing")} of {valued.length} are worth under US$1, so singles are the cheap way to the cards you actually want.
          </>,
        ].filter(Boolean),
        lede: (
          <>
            <p>
              <strong>
                {short}, {set.name}
              </strong>
              , is a One Piece Card Game {KIND_WORD[kind]}
              {set.releasedOn ? <> released on {longDate(set.releasedOn)}</> : null}. These are its 20 most valuable printings today by TCGplayer&apos;s market
              price, with the cheapest copy we track in {m.place} beside each one. Every figure is read from OP Compare&apos;s price data when the page is built,
              never typed, so the order changes as the market does.
            </p>
            {spec.note ? <p>{spec.note}</p> : null}
            <p>
              Looking for one card rather than the chase list? <Link href={setHref}>The full {short} card list</Link> prices all{" "}
              {plural(cards.length, "printing")} at every store we track.
            </p>
          </>
        ),
        sections: [
          { id: "top", title: `The 20 most valuable ${short} cards`, body: <CardTable cards={top} setById={cat.setById} country={country} /> },
          {
            id: "what",
            title: "What the top 20 is made of",
            body: (
              <>
                <PrintingTable cards={top} />
                <p>
                  One Piece sets keep their value in their premium printings: Manga Rares, SPs, Treasure Rares and parallel (alt-art) versions of the set&apos;s
                  Secret and Super Rares. A standard Common or Uncommon almost never makes a top 20, which is why the same card number can be worth cents in one
                  printing and hundreds of dollars in another. <Link href="/guides/one-piece-card-rarities-explained">Our rarity guide</Link> explains each printing.
                </p>
              </>
            ),
          },
          {
            id: "manga",
            title: `${short} Manga Rares`,
            body: manga.length ? (
              <>
                <p>
                  Manga Rares reprint a card over panels from Eiichiro Oda&apos;s manga and are the rarest pull in most sets.{" "}
                  {manga.length === 1 ? `${short} has one priced Manga printing.` : `${short} has ${manga.length} priced Manga printings.`}
                </p>
                <CardTable cards={manga} setById={cat.setById} country={country} />
              </>
            ) : (
              <p>TCGplayer lists no priced Manga printing under {short}.</p>
            ),
          },
          {
            id: "sp",
            title: `${short} SP and Treasure Rare cards`,
            body:
              sp.length || treasure.length ? (
                <>
                  <p>
                    SP cards are special-art reprints, often of older cards, inserted into this set&apos;s packs; Treasure Rares are the set&apos;s
                    other premium insert. {sp.length ? `${plural(sp.length, "SP printing")} ${sp.length === 1 ? "is" : "are"} priced` : "No SP printing is priced"}
                    {treasure.length ? `, plus ${plural(treasure.length, "Treasure Rare")}` : ""}.
                  </p>
                  <CardTable cards={[...treasure, ...sp].sort(byMarketDesc)} setById={cat.setById} country={country} />
                </>
              ) : (
                <p>TCGplayer lists no priced SP or Treasure Rare printing under {short}.</p>
              ),
          },
          {
            id: "alt",
            title: `The dearest ${short} alt arts`,
            body: alt.length ? (
              <>
                <p>
                  {plural(alt.length, "parallel (alt-art) printing")} {alt.length === 1 ? "is" : "are"} priced. These are the ten dearest; the rest are on{" "}
                  <Link href={setHref}>the card list</Link>.
                </p>
                <CardTable cards={alt.slice(0, 10)} setById={cat.setById} country={country} />
              </>
            ) : (
              <p>No alt-art printing is priced yet.</p>
            ),
          },
          {
            id: "leaders",
            title: `${short} Leaders by price`,
            body: leaders.length ? (
              <>
                <p>
                  Leaders decide a deck&apos;s colours and life, so a set&apos;s Leaders are what most players buy first. The standard prints of {short}&apos;s{" "}
                  {plural(leaders.length, "Leader")}, dearest first (alt-art Leaders are in the sections above):
                </p>
                <CardTable cards={leaders} setById={cat.setById} country={country} />
                <p>
                  A cheap Leader is not a weak one: <Link href="/blog/cheapest-one-piece-leaders">our cheap Leaders guide</Link> lists the playable ones under a few
                  dollars across every set.
                </p>
              </>
            ) : (
              <p>This set has no priced standard Leader.</p>
            ),
          },
          {
            id: "box",
            title: `Should you open ${short}?`,
            body: (
              <>
                <p>
                  {boxSentence(set, sealed, country)} A box holds a small slice of the set, and the expected haul of most boxes is dominated by commons and rares
                  worth cents: the top 20 above are what make a box exciting, and most boxes contain none of them.
                </p>
                <p>
                  For a card you want, buying it single is almost always cheaper. To check a box&apos;s maths yourself, try the{" "}
                  <Link href="/tools/box-ev">box EV calculator</Link>.
                </p>
              </>
            ),
          },
          {
            id: "next",
            title: "Other sets",
            body: (
              <p>
                The same list for other sets:{" "}
                {neighbours.map((n, j) => (
                  <span key={n.slug}>
                    {j ? " and " : ""}
                    <Link href={n.path}>{n.short}&apos;s most valuable cards</Link>
                  </span>
                ))}
                . The newest sets have their own chase lists: <Link href="/blog/op17-most-valuable-cards">OP17</Link>,{" "}
                <Link href="/blog/eb05-chase-cards">EB05</Link> and <Link href="/blog/op18-chase-cards">OP18</Link>. Across every set, the dearest cards are in{" "}
                <Link href="/blog/most-expensive-one-piece-cards">the most expensive One Piece cards</Link>.
              </p>
            ),
          },
        ],
      };
    },
  };
}
