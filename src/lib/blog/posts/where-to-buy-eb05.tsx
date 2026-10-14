import Link from "next/link";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES, COUNTRY_LIST, type Country } from "../../country";
import type { SealedLite } from "../../data";
import { longDate, money } from "../../format";
import { PREORDER_PAGES, kindRank, upcomingPreorderPages } from "../../preorders";
import { STORES } from "../../stores";
import type { Post } from "../types";
import { byMarketDesc, plural } from "../util";

// "Where to buy <new set>", RiftCompare's best-performing post shape, for EB05.
// Every price is read from the sealed catalogue at render time (each market's
// cheapest live listing in its own currency, and how many sellers have it), so
// the post follows the pre-order board day by day and says "not listed yet"
// rather than inventing a figure. The release facts are Bandai's, dated: the
// English product page (en.onepiece-cardgame.com/products/eb05.html) and the
// Japanese one, as read on 14 October 2026. The English page prints no pack
// size or box count, so neither is stated unless the catalogue carries one.
// Links to other posts are literal paths at each post's own URL (postHref): this
// file is imported by lib/blog/index.ts, so it cannot import postHrefFor back.
const CODE = "EB05";
const PREORDER_PATH = PREORDER_PAGES[CODE];

const KIND_LABEL: Record<string, string> = {
  "Booster Box": "Booster box",
  "Booster Case": "Booster box case",
  "Booster Pack": "Booster pack",
  "Sleeved Booster Pack": "Sleeved booster pack",
};
const labelOf = (s: SealedLite) => KIND_LABEL[s.kind] ?? s.name;

/** "US$299.99 (3)", "£12.00 (eBay only)" or "—": a market's cheapest live listing and its sellers (eBay is never counted as one). */
function cell(s: SealedLite, m: Country): string {
  const low = s.low[m];
  if (low == null) return "—";
  return `${money(low, m)} ${s.stores[m] ? `(${s.stores[m]})` : "(eBay only)"}`;
}

export const whereToBuyEb05: Post = {
  slug: "where-to-buy-one-piece-eb05",
  title: () => "Where to Buy One Piece EB05 (Heroines Edition Vol. 2): Pre-Order Prices by Market",
  description:
    "Where to pre-order One Piece EB05, Extra Booster: Heroines Edition Vol. 2 (out 30 October 2026): the cheapest booster box, case and pack in each market we track.",
  tags: ["eb05", "pre-order", "sealed", "buying"],
  category: "blog",
  date: "2026-10-14",
  minutes: 6,
  faq: [
    {
      q: "When does One Piece EB05 come out?",
      a: "Bandai's English product page dates EB05, Extra Booster: One Piece Heroines Edition Vol. 2, 30 October 2026; the Japanese edition is dated 31 October 2026. Every upcoming set is on [the release dates page](/release-dates).",
    },
    {
      q: "How much does an EB05 booster pack cost?",
      a: "Bandai's English page gives an MSRP of US$4.99 per pack. Stores set their own pre-order prices for packs, boxes and cases, and they differ; [the EB05 pre-order board](/eb05-preorders) lists every tracked seller's price in your currency, cheapest first.",
    },
    {
      q: "How many packs are in an EB05 booster box?",
      a: "Bandai's English product page does not print the English pack size or how many packs a box holds, so we do not state a number. The Japanese pack holds 6 cards. Check the listing before you pay, and compare a box with other boxes, never with a case.",
    },
    {
      q: "Is it cheaper to pre-order EB05 or wait until release?",
      a: "Nobody can know in advance, and we do not forecast prices. A pre-order fixes the price you pay; after release the price is whatever sellers then ask. What can be checked today is the spread between sellers for the identical sealed product, which [the pre-order board](/eb05-preorders) shows.",
    },
    {
      q: "Does a pre-order price include postage?",
      a: "No. Every price in this post and on the pre-order board is an item price as the seller lists it. A booster box or case ships as a parcel, so compare the delivered total at each store's checkout before you order.",
    },
    {
      q: "What comes after EB05?",
      a: "OP-18, The Dominance of God, listed for 20 November 2026. Its pre-order prices are on [the OP18 pre-order board](/op18-preorders), and every later set is on [the release dates page](/release-dates).",
    },
  ],
  related: [
    { href: PREORDER_PATH, label: "EB05 pre-order prices" },
    { href: PREORDER_PAGES.OP18, label: "OP18 pre-order prices" },
    { href: "/release-dates", label: "Release dates" },
    { href: "/sealed", label: "Sealed products" },
  ],
  build: ({ cat, sealed, country }) => {
    const set = cat.sets.find((s) => s.code === CODE);
    if (!set) {
      return {
        heroCards: [],
        summary: [],
        lede: (
          <p>
            EB05 is not in the catalogue yet. <Link href={PREORDER_PATH}>The EB05 pre-order board</Link> and <Link href="/release-dates">the release dates page</Link> fill in
            as soon as it is.
          </p>
        ),
        sections: [],
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    const released = set.releasedOn != null && set.releasedOn <= today;
    const word = released ? "listing" : "pre-order";
    const c = COUNTRIES[country];
    const vol1 = cat.sets.find((s) => s.code === "EB03" && /Heroines Edition$/.test(s.name));
    const cards = cat.cards.filter((x) => x.setId === set.id);
    const products = sealed.filter((s) => s.setId === set.id).sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.name.localeCompare(b.name));
    const box = products.find((s) => s.kind === "Booster Box");
    const unlisted = products.filter((s) => COUNTRY_LIST.every((m) => s.low[m.code] == null));
    const marketsWith = COUNTRY_LIST.filter((m) => products.some((s) => s.low[m.code] != null));
    const others = upcomingPreorderPages(cat.sets, today).filter((l) => l.code !== CODE);
    const setLink = <Link href={`/sets/${set.slug}`}>the EB05 card list</Link>;
    const boardLink = (text: string) => <Link href={PREORDER_PATH}>{text}</Link>;

    const marketLine = (code: Country) => {
      const m = COUNTRIES[code];
      const stores = STORES.filter((s) => s.country === code).length;
      const tracked = `${plural(stores, "store")}${code === "US" ? " plus TCGplayer" : ""}`;
      const listed = products.filter((s) => s.low[code] != null);
      if (!listed.length) {
        const sellers = stores + (code === "US" ? 1 : 0);
        const nobody = sellers === 1 ? `The one ${stores ? "store" : "seller"} we track in ${m.place} has not` : sellers === 0 ? `No store we track in ${m.place} has` : `None of the ${tracked} we track in ${m.place} has`;
        return (
          <p>
            {nobody} listed an EB05 product yet. {boardLink("The pre-order board")} fills in on its own as {sellers === 1 ? "it does" : "they do"}, with prices in{" "}
            {m.currency}.
          </p>
        );
      }
      return (
        <>
          <p>
            We track {tracked} in {m.place}; {listed.length} of the {products.length} EB05 products {listed.length === 1 ? "is" : "are"} listed there today, in{" "}
            {m.currency}:
          </p>
          <ul>
            {listed.map((s) => (
              <li key={s.id}>
                <Link href={`/sealed/${s.slug}`}>{labelOf(s)}</Link>: from <strong>{money(s.low[code], code)}</strong>
                {s.stores[code] ? `, ${plural(s.stores[code], "seller")} listing it` : ", an eBay listing only so far"}.
              </li>
            ))}
          </ul>
        </>
      );
    };

    return {
      heroCards: cards.filter((x) => x.hasImage).sort(byMarketDesc).slice(0, 3),
      summary: [
        <>
          <strong>EB05 is out 30 October 2026</strong> in English, by Bandai&apos;s product page; the Japanese edition follows on 31 October 2026.
        </>,
        box && box.low[country] != null ? (
          <>
            <strong>
              Cheapest EB05 booster box {word} in {c.place} today: {money(box.low[country], country)}
            </strong>
            {box.stores[country] ? `; ${plural(box.stores[country], "tracked seller")} ${box.stores[country] === 1 ? "has" : "have"} it listed.` : ", an eBay listing (no tracked store has one yet)."}
          </>
        ) : (
          <>No store we track in {c.place} has listed an EB05 booster box yet; the table below shows the markets that have.</>
        ),
        products.length ? (
          <>
            {marketsWith.length
              ? `${marketsWith.length} of the ${COUNTRY_LIST.length} markets we track have at least one EB05 product listed: ${marketsWith.map((m) => m.code).join(", ")}.`
              : `None of the ${COUNTRY_LIST.length} markets we track has an EB05 product listed yet.`}
          </>
        ) : null,
        <>Bandai&apos;s MSRP is US$4.99 per pack. Every price here is an item price, before postage.</>,
        <>Prices move daily: {boardLink("the EB05 pre-order board")} ranks every tracked seller in your market, cheapest first.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>EB05 is Extra Booster: One Piece Heroines Edition Vol. 2</strong>, the second Extra Booster built around the series&apos; heroines
            {vol1 ? (
              <>
                , after <Link href={`/sets/${vol1.slug}`}>Heroines Edition</Link> ({vol1.code}
                {vol1.releasedOn ? `, ${longDate(vol1.releasedOn)}` : ""})
              </>
            ) : null}
            . {released ? "It is out now" : "It is not out yet"}, so {released ? "its sealed product is priced like any other set's" : "every booster box is identical at every seller: nobody has opened one, and the only thing that differs is the price each seller has chosen to ask"}.
          </p>
          <p>
            Below is the cheapest {word} we track for each EB05 product in each market, in that market&apos;s own currency, read from OP Compare&apos;s price data
            when this page was built. For the live, seller-by-seller comparison in your market, open {boardLink("the EB05 pre-order price board")}.
          </p>
        </>
      ),
      sections: [
        {
          id: "what-is-eb05",
          title: "What EB05 is",
          body: (
            <>
              <p>From Bandai&apos;s product pages, as of 14 October 2026:</p>
              <ul>
                <li>
                  <strong>English release: 30 October 2026</strong> (Bandai&apos;s English product page). The Japanese edition is dated 31 October 2026.
                </li>
                <li>
                  <strong>MSRP: US$4.99 per pack</strong> in the US.
                </li>
                <li>
                  <strong>&ldquo;75+2 types in total&rdquo;</strong>: 75 cards plus 2 DON!! cards. The English page lists the rarities as Leaders, Commons, Rares, Super
                  Rares, Secret Rares, Special Cards and DON!! cards; Bandai&apos;s Japanese page splits the 75 into 7 Leaders, 29 Commons, 21 Rares, 9 Super Rares, 1
                  Secret Rare and 8 Special Cards.
                </li>
                <li>
                  <strong>Pack size:</strong> the Japanese pack holds 6 cards. Bandai&apos;s English page prints neither the English pack size nor the number of packs in
                  a box, so we treat both as unconfirmed
                  {box?.packCount ? `; TCGplayer's listing gives the box ${box.packCount} packs` : ""}.
                </li>
              </ul>
              {cards.length ? (
                <p>
                  TCGplayer lists {plural(cards.length, "EB05 printing")} so far, alternate arts counted separately; {setLink} prices each one as stores list
                  it.
                </p>
              ) : (
                <p>No EB05 cards are listed on TCGplayer yet; {setLink} fills in as they are.</p>
              )}
            </>
          ),
        },
        {
          id: "products",
          title: `The EB05 product line: cheapest ${word} in each market`,
          body: products.length ? (
            <>
              <p>
                Each cell is the cheapest live listing we track in that market (a store, TCGplayer in the US, or eBay), in local currency and before postage. The
                number in brackets counts the sellers with it listed: stores, plus TCGplayer in the US; eBay is shown but never counted as a store. A dash means no
                listing yet.
              </p>
              <SimpleTable
                head={["Product", ...COUNTRY_LIST.map((m) => m.code)]}
                align={["l", ...COUNTRY_LIST.map(() => "r" as const)]}
                rows={products.map((s) => [
                  <Link key="n" href={`/sealed/${s.slug}`}>
                    {labelOf(s)}
                  </Link>,
                  ...COUNTRY_LIST.map((m) => cell(s, m.code)),
                ])}
              />
              {unlisted.length ? (
                <p>
                  {unlisted.map((s, i) => (
                    <span key={s.id}>
                      {i ? " " : ""}No store we track has listed the EB05 {labelOf(s).toLowerCase()} in any market yet.
                    </span>
                  ))}
                </p>
              ) : null}
              <Callout title="The live board">
                {boardLink(`EB05 ${word} prices from every tracked store →`)} Each product lists every tracked seller in your market beside TCGplayer&apos;s cheapest
                listing and eBay&apos;s, ranked by item price and refreshed daily.
              </Callout>
            </>
          ) : (
            <p>No EB05 sealed product is in the catalogue yet. {boardLink("The pre-order board")} lists it as soon as TCGplayer and the stores do.</p>
          ),
        },
        {
          id: "markets",
          title: "Market by market",
          body: (
            <>
              {COUNTRY_LIST.map((m) => (
                <div key={m.code}>
                  <h3>
                    {m.flag} {m.label}
                  </h3>
                  {marketLine(m.code)}
                </div>
              ))}
              <p>
                The eurozone is one market: its stores quote euro prices and ship across the single market without customs. Buying from another market adds
                international postage and often import tax; <Link href="/blog/are-one-piece-cards-cheaper-abroad">whether that ever pays</Link> is a post of its own.
              </p>
            </>
          ),
        },
        {
          id: "preorder-or-wait",
          title: "Pre-order or wait?",
          body: (
            <>
              <p>How each choice works, not a prediction: we do not forecast prices.</p>
              <ul>
                <li>
                  <strong>A pre-order fixes your price and your place in the seller&apos;s allocation.</strong> You commit before release and the product ships on or
                  after it. Some stores charge at checkout, others when they dispatch, and cancellation terms differ: read the store&apos;s pre-order terms first.
                </li>
                <li>
                  <strong>Before release, every seller is picking an opening price.</strong> Nobody has the stock yet, so pre-order prices spread widely for an
                  identical sealed product. That spread is what comparing sellers is for.
                </li>
                <li>
                  <strong>After release, the price is whatever sellers then ask.</strong> It can sit above or below today&apos;s pre-orders. Each product&apos;s page
                  keeps its price history, so how it moved can be read there afterwards.
                </li>
                <li>
                  <strong>Want particular cards rather than packs?</strong> A card has a price only once people sell it singly; {setLink} shows each EB05 card as it is
                  listed.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "how-to-compare",
          title: "How to compare, and where not to look",
          body: (
            <ul>
              <li>Compare like with like: a case holds several boxes, so its price belongs next to other cases, never next to a box.</li>
              <li>Check the language. The Japanese EB05 is a different product (Japanese text, 6-card packs, out 31 October 2026), and some stores list both.</li>
              <li>
                Before release, a marketplace listing is a seller&apos;s asking price for stock they expect to receive, not a store&apos;s list price. Check who is
                selling and when they say it ships.
              </li>
              <li>Compare delivered totals. Every price here is an item price; a box or case ships as a parcel and postage can change which seller is cheapest.</li>
              <li>
                Stay in your own market where you can. <Link href="/guides/where-to-buy-one-piece-cards">Where to buy One Piece cards</Link> compares the
                stores in each market.
              </li>
            </ul>
          ),
        },
        {
          id: "next",
          title: "Also coming",
          body: (
            <>
              {others.length ? (
                <p>
                  {others.map((l, i) => (
                    <span key={l.code}>
                      {i ? " " : ""}
                      <strong>
                        {l.code}, {l.name}
                      </strong>
                      , is listed for {longDate(l.releasedOn)}: <Link href={l.href}>{l.code} pre-order prices from every tracked store</Link>.
                    </span>
                  ))}
                </p>
              ) : null}
              <p>
                Every announced set and its date is on <Link href="/release-dates">the release dates page</Link>, and every sealed product we price, released or not, is
                on <Link href="/sealed">the sealed page</Link>.
              </p>
            </>
          ),
        },
      ],
    };
  },
};
