import Link from "next/link";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { money } from "../../format";
import { headline } from "../../price";
import type { Post } from "../types";
import { monthYear } from "../util";

// One query: "one piece starter deck price". Every figure is read from the
// snapshot at render. Super Pre-Release decks are collector items, listed apart.
const isCollector = (name: string) => /super pre-release/i.test(name);

export const starterDecks: Post = {
  slug: "one-piece-starter-deck-prices",
  title: ({ cat }) => `One Piece Starter Deck Prices Compared (${monthYear(cat.pricesAt)})`,
  description:
    "Every One Piece Card Game starter deck and Ultra Deck with its TCGplayer market price and the cheapest in-stock copy in your market, cheapest first.",
  tags: ["sealed", "starter deck", "prices", "buying"],
  date: "2026-10-23",
  category: "guide",
  minutes: 4,
  related: [
    { href: "/sealed", label: "Every sealed product" },
    { href: "/blog/cheapest-one-piece-leaders", label: "Cheapest Leaders" },
    { href: "/deck", label: "Deck Builder & Pricer" },
  ],
  faq: [
    {
      q: "What is the cheapest One Piece starter deck?",
      a: "The table on this page sorts every English starter deck by TCGplayer's market price, cheapest first, from today's data; the first row is the cheapest.",
    },
  ],
  build: ({ sealed, country }) => {
    const c = COUNTRIES[country];
    const decks = sealed.filter((s) => s.kind === "Starter Deck" && s.marketUsd != null);
    const play = decks.filter((s) => !isCollector(s.name)).sort((a, b) => a.marketUsd! - b.marketUsd!);
    const collector = decks.filter((s) => isCollector(s.name)).sort((a, b) => b.marketUsd! - a.marketUsd!);
    const row = (s: (typeof decks)[number]) => {
      const h = headline(s, country);
      return [
        <Link key="n" href={`/sealed/${s.slug}`}>{s.name}</Link>,
        money(s.marketUsd, "US"),
        h.kind === "listing" ? `${money(h.cents, country)} (${h.stores})` : "—",
      ];
    };
    const cheapest = play[0];
    const inStock = play.filter((s) => s.low[country] != null).length;
    return {
      heroCards: [],
      summary: [
        cheapest ? (
          <>
            <strong>Cheapest One Piece starter deck:</strong> <Link href={`/sealed/${cheapest.slug}`}>{cheapest.name}</Link> at {money(cheapest.marketUsd, "US")}.
          </>
        ) : null,
        <>
          {inStock} of {play.length} starter decks are in stock at a store we track in {c.place} today.
        </>,
        collector.length ? <>Super Pre-Release decks are collector items and listed separately.</> : null,
      ].filter(Boolean),
      lede: (
        <p>
          <strong>One Piece starter deck prices</strong> run from a few dollars for a current deck to hundreds for an early collector print. This guide lists
          every English starter deck and Ultra Deck we price, cheapest first, with TCGplayer&apos;s market price and the cheapest copy in stock in {c.place}.
        </p>
      ),
      sections: [
        {
          id: "table",
          title: "Every One Piece starter deck, cheapest first",
          body: <SimpleTable head={["Deck", "Market (US$)", `Cheapest in ${c.code} (stores)`]} rows={play.map(row)} align={["l", "r", "r"]} />,
        },
        ...(collector.length
          ? [
              {
                id: "collector",
                title: "Super Pre-Release starter decks",
                body: <SimpleTable head={["Deck", "Market (US$)", `Cheapest in ${c.code} (stores)`]} rows={collector.map(row)} align={["l", "r", "r"]} />,
              },
            ]
          : []),
        {
          id: "after",
          title: "After the starter deck",
          body: (
            <Callout title="Upgrading a deck">
              Paste a list into the <Link href="/deck">Deck Builder &amp; Pricer</Link> to price every upgrade at the cheapest store, or start from one of
              the <Link href="/blog/cheapest-one-piece-leaders">cheapest One Piece Leaders</Link>.
            </Callout>
          ),
        },
      ],
    };
  },
};
