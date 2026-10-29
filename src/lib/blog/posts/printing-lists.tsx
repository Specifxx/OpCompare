import Link from "next/link";
import type { ReactNode } from "react";
import { CardTable, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import type { CardLite } from "../../data";
import { money } from "../../format";
import type { Post } from "../types";
import { byMarketDesc, medianOf, plural } from "../util";
import { CardLink } from "./set-reveal-shared";

// Every Manga Rare, SP and Treasure Rare in one list each (29 October 2026): the
// searches "one piece manga rares", "one piece sp cards" and "one piece treasure
// rare" are list-shaped, and no page on the site answered them across sets. Each
// list is the catalogue's at render time (TCGplayer's printing, its market price
// and the cheapest copy we track), so a new set's printings join on the next
// import and no price is typed.

interface PrintingSpec {
  printing: "manga" | "sp" | "treasure";
  slug: string;
  label: string;
  plural: string;
  title: string;
  description: string;
  what: () => ReactNode;
  faq: { q: string; a: string }[];
}

const SPECS: PrintingSpec[] = [
  {
    printing: "manga",
    slug: "one-piece-manga-rare-cards",
    label: "Manga Rare",
    plural: "Manga Rares",
    title: "Every One Piece Manga Rare Card and Its Price",
    description: "Every One Piece Card Game Manga Rare, set by set, with live TCGplayer and store prices: which are the dearest, and how many each set has.",
    what: () => (
      <>
        A <strong>Manga Rare</strong> is a printing of a card, usually a set&apos;s headline character, drawn over black-and-white panels from Eiichiro Oda&apos;s
        manga. Most booster sets have one or two, they turn up far less often than a box&apos;s other premium pulls, and they are usually the most valuable
        card in their set. The card number is the same as the standard print, so check the variant before you compare prices.
      </>
    ),
    faq: [
      { q: "What is a Manga Rare in the One Piece Card Game?", a: "A premium printing of a card set over panels from the original manga, usually of the set's headline character. It has the same card number as the standard print and is listed on TCGplayer as a separate printing." },
      { q: "How many Manga Rares are in a booster box?", a: "Bandai does not publish pull rates, and most boxes contain none. A Manga Rare is the rarest pull in most sets, which is why buying the card single is usually cheaper than opening boxes for it." },
      { q: "Which One Piece Manga Rare is the most expensive?", a: "The first row of the table on this page, ranked by TCGplayer's market price every time the page is built." },
    ],
  },
  {
    printing: "sp",
    slug: "one-piece-sp-cards",
    label: "SP card",
    plural: "SP cards",
    title: "One Piece SP Cards: Every Special Card and Its Price",
    description: "Every One Piece Card Game SP (special) card, with live TCGplayer and store prices: what an SP is, the dearest ones and which set each comes from.",
    what: () => (
      <>
        An <strong>SP card</strong> (shown as a gold or silver &ldquo;SP&rdquo; on the card) is a special-art printing inserted into a set&apos;s packs, very often a
        reprint of a popular card from an <em>earlier</em> set. That is why an SP pulled from OP14 can carry an OP05 card number: TCGplayer files it under the set
        whose packs it comes from, and so do we. SPs are rarer than a set&apos;s parallels and are the second chase after the Manga Rare.
      </>
    ),
    faq: [
      { q: "What does SP mean on a One Piece card?", a: "Special. An SP card is a special-art printing inserted into a set's packs, often a reprint of a popular card from an earlier set, with a gold or silver SP mark." },
      { q: "Why does my SP card have a different set's number?", a: "SPs are often reprints of older cards, so they keep the original card number but come from the newer set's packs. TCGplayer, and this page, file each SP under the set you pull it from." },
      { q: "Are SP cards tournament legal?", a: "Yes. An SP is a printing of a normal card and plays exactly like the standard print; only the art and rarity differ." },
    ],
  },
  {
    printing: "treasure",
    slug: "one-piece-treasure-rare-cards",
    label: "Treasure Rare",
    plural: "Treasure Rares",
    title: "One Piece Treasure Rare Cards: The Full List With Prices",
    description: "Every One Piece Card Game Treasure Rare (TR), set by set, with live TCGplayer and store prices: what a Treasure Rare is and which ones are worth the most.",
    what: () => (
      <>
        A <strong>Treasure Rare</strong> (TR) is a premium printing that appears in booster sets from OP-06 onwards: one per set on TCGplayer&apos;s listings, with its own
        Treasure Rare treatment, and among the hardest pulls in the box. Like SPs, a Treasure Rare can be a card from an earlier set, filed under the set whose packs it comes from.
      </>
    ),
    faq: [
      { q: "What is a Treasure Rare in One Piece TCG?", a: "A premium printing with its own Treasure Rare treatment, one per booster set since OP-06 on TCGplayer's listings, and one of the rarest pulls in a box. It plays exactly like the standard card." },
      { q: "How many Treasure Rares are there?", a: "The table on this page lists every Treasure Rare printing TCGplayer has, with its set; the count updates as new sets are added." },
      { q: "Is a Treasure Rare worth more than a Manga Rare?", a: "Usually not: in most sets the Manga Rare is the dearest card. Compare the two in each set using this page and our Manga Rare list." },
    ],
  },
];

function build(spec: PrintingSpec): Post {
  const others = SPECS.filter((s) => s.slug !== spec.slug);
  return {
    slug: spec.slug,
    category: "guide",
    title: () => spec.title,
    description: spec.description,
    tags: [spec.plural.toLowerCase(), "chase cards", "rarity", "prices"],
    date: "2026-10-29",
    minutes: 6,
    faq: spec.faq,
    related: [
      { href: "/guides/one-piece-card-rarities-explained", label: "Rarities explained" },
      { href: "/blog/most-expensive-one-piece-cards", label: "Most expensive cards" },
      { href: "/sets", label: "Every set" },
    ],
    build: ({ cat, country }) => {
      const m = COUNTRIES[country];
      const all = cat.cards.filter((c) => c.printing === spec.printing);
      const priced = all.filter((c) => c.marketUsd != null).sort(byMarketDesc);
      const top = priced.slice(0, 25);
      const median = medianOf(priced.map((c) => c.marketUsd!));
      const bySet = new Map<number, CardLite[]>();
      for (const c of all) bySet.set(c.setId, [...(bySet.get(c.setId) ?? []), c]);
      const setRows = [...bySet.entries()]
        .map(([id, cs]) => ({ set: cat.setById.get(id), cs: cs.sort(byMarketDesc) }))
        .filter((r) => r.set)
        .sort((a, b) => (b.set!.releasedOn ?? "").localeCompare(a.set!.releasedOn ?? ""));
      const cheapest = priced[priced.length - 1];
      const under50 = priced.filter((c) => c.marketUsd! < 5000).length;
      return {
        heroCards: top.filter((c) => c.hasImage).slice(0, 3),
        summary: [
          <>
            <strong>
              {plural(all.length, spec.label)} across {plural(setRows.length, "set")}
            </strong>{" "}
            are listed on TCGplayer, {priced.length} of them with a market price.
          </>,
          top[0] ? (
            <>
              <strong>The dearest:</strong> <CardLink c={top[0]} /> ({top[0].number}, {cat.setById.get(top[0].setId)?.code}) at {money(top[0].marketUsd, "US")}.
            </>
          ) : null,
          median != null ? (
            <>
              The median {spec.label} sells for <strong>{money(Math.round(median), "US")}</strong>
              {cheapest ? `, and the cheapest priced one for ${money(cheapest.marketUsd, "US")}` : ""}.
            </>
          ) : null,
          under50 ? <>{plural(under50, spec.label)} sell for under US$50, so not every one is out of reach.</> : null,
        ].filter(Boolean),
        lede: (
          <>
            <p>{spec.what()}</p>
            <p>
              Below is every {spec.label} TCGplayer lists, ranked by its market price, with the cheapest copy we track in {m.place} beside it, then the same list set
              by set. Every figure is read from OP Compare&apos;s price data when the page is built, so new sets join on their own.
            </p>
          </>
        ),
        sections: [
          {
            id: "top",
            title: `The ${Math.min(25, top.length)} most valuable ${spec.plural}`,
            body: top.length ? <CardTable cards={top} setById={cat.setById} country={country} /> : <p>None is priced yet.</p>,
          },
          {
            id: "by-set",
            title: `${spec.plural} by set`,
            body: (
              <>
                <SimpleTable
                  head={["Set", spec.plural, "Dearest", "TCGplayer"]}
                  align={["l", "r", "l", "r"]}
                  rows={setRows.map(({ set, cs }) => [
                    <Link key="s" href={`/sets/${set!.slug}`}>
                      {set!.code} {set!.name}
                    </Link>,
                    cs.length,
                    <CardLink key="c" c={cs[0]} />,
                    cs[0].marketUsd != null ? money(cs[0].marketUsd, "US") : "—",
                  ])}
                />
                <p>Newest set first. Open a set for its full card list, or a card for every store&apos;s price in your market.</p>
              </>
            ),
          },
          {
            id: "buying",
            title: `Buying a ${spec.label}`,
            body: (
              <ul>
                <li>
                  <strong>Check the printing, not just the number.</strong> The standard print shares the card number and can cost a fraction of the {spec.label}. The
                  card page lists every printing of a card side by side.
                </li>
                <li>
                  <strong>Buying single is cheaper than chasing one in packs.</strong> Most booster boxes contain no {spec.label} at all; the{" "}
                  <Link href="/tools/box-ev">box EV calculator</Link> shows what a box is expected to return.
                </li>
                <li>
                  <strong>Condition matters more at this price.</strong> Ask for photos of the corners and surface of an expensive card, and compare near-mint with
                  near-mint.
                </li>
                <li>
                  <strong>Compare delivered totals.</strong> Every price here is before postage; a tracked, insured parcel for a valuable card adds to the total.
                </li>
              </ul>
            ),
          },
          {
            id: "more",
            title: "Other chase printings",
            body: (
              <p>
                {others.map((o, i) => (
                  <span key={o.slug}>
                    {i ? " and " : "See also "}
                    <Link href={`/guides/${o.slug}`}>every {o.label}</Link>
                  </span>
                ))}
                . Each set&apos;s own chase list, Manga, SP and Leaders included, is in its &ldquo;most valuable cards&rdquo; post, for example{" "}
                <Link href="/blog/op15-most-valuable-cards">OP15</Link> and <Link href="/blog/op17-most-valuable-cards">OP17</Link>.
              </p>
            ),
          },
        ],
      };
    },
  };
}

export const [mangaRares, spCards, treasureRares] = SPECS.map(build);
