import Link from "next/link";
import type { ReactNode } from "react";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES, type Country } from "../../country";
import type { Catalog, SealedLite } from "../../data";
import { money } from "../../format";
import type { Post } from "../types";
import { plural } from "../util";

// The 2026 holiday gift guide (29 October 2026). Every product is picked from the
// sealed catalogue by set code and kind, and every price is that product's
// cheapest live listing in the reader's market at render time, so a product a
// market does not stock says so instead of showing a typed price. The only typed
// facts are the products' own names and the Black Friday date (27 November 2026).

interface Pick {
  code: string;
  kind: string;
  /** Optional name filter, for sets with several products of one kind. */
  name?: RegExp;
}

interface Tier {
  id: string;
  title: string;
  who: string;
  picks: Pick[];
  note: () => ReactNode;
}

const TIERS: Tier[] = [
  {
    id: "stocking",
    title: "Stocking fillers: a pack or two",
    who: "Anyone who enjoys opening packs. A pack is a lottery ticket, not a deck.",
    picks: [
      { code: "OP17", kind: "Booster Pack" },
      { code: "EB05", kind: "Booster Pack" },
      { code: "OP16", kind: "Booster Pack" },
    ],
    note: () => <>Pack prices differ by set and by market, so the table shows today&apos;s cheapest for each. For a player, a pack is a treat; their want list is the useful present.</>,
  },
  {
    id: "starter",
    title: "For a new player: a starter deck",
    who: "Someone who wants to play, or a second player for a family. A starter is a complete, legal deck out of the box.",
    picks: [
      { code: "SD01", kind: "Starter Deck" },
      { code: "ST-31", kind: "Starter Deck" },
      { code: "ST-35", kind: "Starter Deck" },
      { code: "ST-30", kind: "Starter Deck" },
      { code: "LT-01", kind: "Starter Deck" },
    ],
    note: () => (
      <>
        The Set Sail Deck Set and Learn Together Deck Set are Bandai&apos;s products for learning the game; the numbered starter decks (ST-31 to ST-36) each
        build around one Leader. <Link href="/guides/one-piece-starter-deck-prices">Our starter deck guide</Link> compares them all.
      </>
    ),
  },
  {
    id: "collector-mid",
    title: "For a collector: Double Pack Sets and Illustration Boxes",
    who: "Someone who already plays and likes extras: promo cards, DON!! cards and art.",
    picks: [
      { code: "OP17", kind: "Double Pack Set" },
      { code: "OP16", kind: "Double Pack Set" },
      { code: "OP-PR", kind: "Illustration Box", name: /Vol\. 8/ },
      { code: "OP-PR", kind: "Premium Collection", name: /Best Selection Vol\. 6/ },
    ],
    note: () => <>A Double Pack Set is two booster packs plus a promo; check which promo and DON!! card each volume includes before you buy, because they differ.</>,
  },
  {
    id: "box",
    title: "The big present: a booster box",
    who: "A collector or a player who loves opening. A box is a full display of one set's packs.",
    picks: [
      { code: "OP17", kind: "Booster Box" },
      { code: "EB05", kind: "Booster Box" },
      { code: "OP16", kind: "Booster Box" },
      { code: "EB03", kind: "Booster Box" },
    ],
    note: () => (
      <>
        Before buying a box for value rather than fun, read the set&apos;s chase list: <Link href="/blog/op17-most-valuable-cards">OP17</Link>,{" "}
        <Link href="/blog/eb05-chase-cards">EB05</Link> and <Link href="/blog/eb03-most-valuable-cards">EB03</Link>. Most boxes contain none of the top cards.
      </>
    ),
  },
];

function pick(cat: Catalog, sealed: SealedLite[], p: Pick): SealedLite | undefined {
  const setIds = new Set(cat.sets.filter((s) => s.code === p.code).map((s) => s.id));
  return sealed.find((s) => s.setId != null && setIds.has(s.setId) && s.kind === p.kind && (!p.name || p.name.test(s.name)));
}

function priceCell(s: SealedLite, country: Country): string {
  const low = s.low[country];
  if (low == null) return "Not stocked here yet";
  return `${money(low, country)}${s.stores[country] ? ` (${plural(s.stores[country], "seller")})` : " (eBay)"}`;
}

export const giftGuide: Post = {
  slug: "one-piece-card-game-gift-guide",
  title: () => "One Piece Card Game Gift Guide 2026: Best Gifts by Budget",
  description: "What to buy a One Piece Card Game fan this holiday season, from a single pack to a booster box, with live store prices in your market and Black Friday tips.",
  tags: ["gift guide", "black friday", "christmas", "sealed", "buying"],
  date: "2026-10-29",
  minutes: 7,
  faq: [
    {
      q: "What is the best One Piece Card Game gift for a beginner?",
      a: "A starter deck: a complete, legal deck that needs nothing else to play. The Set Sail Deck Set and Learn Together Deck Set are made for learning the game; the numbered starter decks each build around one Leader.",
    },
    {
      q: "Should I buy a booster box or single cards?",
      a: "For a player, the exact single cards they want are far cheaper than opening boxes for them. A booster box is a good present for someone who enjoys opening packs or collects a set.",
    },
    {
      q: "Will One Piece cards be cheaper on Black Friday?",
      a: "Some stores discount on Black Friday (27 November 2026), but compare any deal with today's live price on OP Compare, not with a crossed-out 'was' price or the MSRP.",
    },
    {
      q: "How do I know which cards they want?",
      a: "Ask which Leader they play. Every Leader has a page with its cards and prices, and a set's most valuable cards post lists its chase cards if they collect.",
    },
  ],
  related: [
    { href: "/sealed", label: "Sealed prices" },
    { href: "/sealed?kind=Starter+Deck", label: "Starter decks" },
    { href: "/sealed?kind=Booster+Box", label: "Booster boxes" },
  ],
  build: ({ cat, sealed, country }) => {
    const m = COUNTRIES[country];
    const rows = TIERS.map((t) => ({ t, items: t.picks.map((p) => pick(cat, sealed, p)).filter((s): s is SealedLite => Boolean(s)) }));
    const box = rows.find((r) => r.t.id === "box")?.items.find((s) => s.low[country] != null);
    const starter = rows.find((r) => r.t.id === "starter")?.items.filter((s) => s.low[country] != null).sort((a, b) => a.low[country]! - b.low[country]!)[0];
    return {
      heroCards: [],
      summary: [
        starter ? (
          <>
            <strong>For a beginner:</strong> a starter deck, from <Link href={`/sealed/${starter.slug}`}>{starter.name}</Link> at {money(starter.low[country], country)}{" "}
            in {m.place} today.
          </>
        ) : (
          <>
            <strong>For a beginner:</strong> a starter deck, a complete deck that needs nothing else.
          </>
        ),
        <>
          <strong>For a player:</strong> the single cards on their list beat packs on value every time.
        </>,
        box ? (
          <>
            <strong>For a collector:</strong> a booster box, from {money(box.low[country], country)} for <Link href={`/sealed/${box.slug}`}>{box.name}</Link>.
          </>
        ) : null,
        <>
          <strong>On Black Friday (27 November)</strong>, compare with today&apos;s live price, not a crossed-out one.
        </>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            Buying for a One Piece Card Game fan? This guide goes budget by budget: what each product is, who it suits and what it costs in {m.place} today. Every
            price is the cheapest live listing we track, read from OP Compare&apos;s price data when the page is built, and switches with the market you pick.
          </p>
        </>
      ),
      sections: [
        ...rows.map(({ t, items }) => ({
          id: t.id,
          title: t.title,
          body: (
            <>
              <p>
                <strong>Who it suits:</strong> {t.who}
              </p>
              {items.length ? (
                <SimpleTable
                  head={["Product", `Cheapest in ${m.place}`, "TCGplayer"]}
                  align={["l", "r", "r"]}
                  rows={items.map((s) => [
                    <Link key="n" href={`/sealed/${s.slug}`}>
                      {s.name}
                    </Link>,
                    priceCell(s, country),
                    s.marketUsd != null ? money(s.marketUsd, "US") : "—",
                  ])}
                />
              ) : null}
              <p>{t.note()}</p>
            </>
          ),
        })),
        {
          id: "singles",
          title: "For a player: buy their want list",
          body: (
            <>
              <p>
                If they already play, the best present is the cards they are missing. It is also the cheapest: the dearest card in a set can be worth more than a
                box, while most playable cards cost under a dollar. Ask which Leader their deck uses and look it up on the{" "}
                <Link href="/leaders">Leaders page</Link>, or paste their list into the <Link href="/tools/best-basket">Buy List Planner</Link>, which finds the
                cheapest store for the whole list in your market.
              </p>
              <p>
                Collectors usually want one premium printing more than ten packs: every set&apos;s Manga Rares, SPs and alt arts are listed in its &ldquo;most valuable
                cards&rdquo; post, and across every set in <Link href="/cards/printing/manga">every Manga Rare</Link> and{" "}
                <Link href="/cards/printing/sp">every SP card</Link>.
              </p>
            </>
          ),
        },
        {
          id: "black-friday",
          title: "Black Friday: how to tell a real deal",
          body: (
            <>
              <ul>
                <li>
                  <strong>Compare with today&apos;s price, not the MSRP.</strong> Older boxes often sell above MSRP and new ones at or below it, so &ldquo;MSRP&rdquo; tells you
                  little. The live price on each product page does.
                </li>
                <li>
                  <strong>Ignore the crossed-out price.</strong> A &ldquo;was&rdquo; price is the store&apos;s own claim; the product page shows what every other store charges
                  today.
                </li>
                <li>
                  <strong>Add postage.</strong> Every price here is before shipping. A box that is a little cheaper but ships from abroad can cost more delivered;{" "}
                  <Link href="/blog/are-one-piece-cards-cheaper-abroad">whether buying abroad pays</Link> has the maths.
                </li>
                <li>
                  <strong>Check the language.</strong> Japanese and English products look alike in listing photos and are different products.
                </li>
              </ul>
              <Callout title="Order early for Christmas">
                Stores set their own Christmas postage cut-offs, usually mid-December for domestic orders and earlier for international ones. Stay in your own market
                where you can: <Link href="/guides/where-to-buy-one-piece-cards">where to buy One Piece cards</Link> compares the stores in each.
              </Callout>
            </>
          ),
        },
      ],
    };
  },
};
