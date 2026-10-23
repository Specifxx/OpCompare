import Link from "next/link";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES, MARKETS } from "../../country";
import { money, shortDate } from "../../format";
import { headline } from "../../price";
import type { Post } from "../types";
import { byMarketDesc, monthYear } from "../util";

// One query, one page: "op17 booster box price". Every figure is read from the
// snapshot at render (the same sealed catalogue the /sealed pages show), and a
// sentence that needs a fact prints only when the fact exists.
const CODE = "OP17";

export const op17BoosterBox: Post = {
  slug: "op17-booster-box-price",
  title: ({ cat }) => `OP17 Booster Box Price Today (${monthYear(cat.pricesAt)})`,
  description:
    "What an OP17 World's Strongest Warriors booster box costs right now: TCGplayer market price, the cheapest in-stock box in each market, cost per pack, and the cards that drive it.",
  tags: ["sealed", "booster box", "OP17", "prices"],
  date: "2026-10-23",
  category: "guide",
  minutes: 4,
  related: [
    { href: "/sealed", label: "Every sealed product" },
    { href: "/tools/box-ev", label: "Box EV calculator" },
    { href: "/release-dates", label: "Release dates" },
  ],
  faq: [
    {
      q: "How many packs are in an OP17 booster box?",
      a: "An English OP17 (The World's Strongest Warriors) booster box holds 24 booster packs, like every main One Piece Card Game booster set.",
    },
    {
      q: "Is the OP17 box price on this page live?",
      a: "Yes. The figures are rebuilt from OP Compare's price data after each import: TCGplayer's market price plus the cheapest in-stock listing at the stores we track in each market.",
    },
  ],
  build: ({ cat, sealed, country }) => {
    const c = COUNTRIES[country];
    const set = cat.sets.find((s) => s.code === CODE);
    const products = set ? sealed.filter((s) => s.setId === set.id) : [];
    const box = products.find((s) => s.kind === "Booster Box");
    const pack = products.find((s) => s.kind === "Booster Pack");
    const caseP = products.find((s) => s.kind === "Booster Case");
    const boxH = box ? headline(box, country) : null;
    const perPack = box?.marketUsd && box.packCount ? Math.round(box.marketUsd / box.packCount) : null;
    const chase = set ? cat.cards.filter((x) => x.setId === set.id && x.marketUsd != null).sort(byMarketDesc).slice(0, 5) : [];
    const marketRows = box
      ? MARKETS.map((m) => {
          const h = headline(box, m);
          return [COUNTRIES[m].place, h.kind === "listing" ? money(h.cents, m) : "—", h.kind === "listing" ? String(h.stores) : "0"];
        })
      : [];
    const productRows = products
      .filter((s) => s.marketUsd != null || Object.values(s.low).some((v) => v != null))
      .map((s) => {
        const h = headline(s, country);
        return [
          <Link key="n" href={`/sealed/${s.slug}`}>{s.name}</Link>,
          s.kind,
          money(s.marketUsd, "US"),
          h.kind === "listing" ? money(h.cents, country) : "—",
        ];
      });
    return {
      heroCards: chase.slice(0, 3),
      summary: [
        box?.marketUsd ? (
          <>
            <strong>OP17 booster box market price:</strong> {money(box.marketUsd, "US")} on TCGplayer
            {perPack ? <> — about {money(perPack, "US")} a pack</> : null}.
          </>
        ) : null,
        boxH?.kind === "listing" ? (
          <>
            <strong>Cheapest in-stock box in {c.place}:</strong> {money(boxH.cents, country)} across {boxH.stores} {boxH.stores === 1 ? "store" : "stores"} —{" "}
            <Link href={`/sealed/${box!.slug}`}>compare every OP17 box listing</Link>.
          </>
        ) : null,
        chase[0] ? (
          <>
            The box price follows its chase cards; the most valuable is <Link href={`/card/${chase[0].slug}`}>{chase[0].name} ({chase[0].number})</Link> at{" "}
            {money(chase[0].marketUsd, "US")}.
          </>
        ) : null,
      ].filter(Boolean),
      lede: (
        <p>
          <strong>The OP17 booster box price</strong> — The World&apos;s Strongest Warriors{set?.releasedOn ? `, released ${shortDate(set.releasedOn)}` : ""} — is shown
          here two ways: TCGplayer&apos;s US market price, and the cheapest box actually in stock at the stores OP Compare tracks in each market. Both come
          from the same data as the <Link href={box ? `/sealed/${box.slug}` : "/sealed"}>OP17 booster box page</Link>.
        </p>
      ),
      sections: [
        {
          id: "by-market",
          title: "OP17 booster box price in every market",
          body: marketRows.length ? (
            <>
              <p>The cheapest in-stock English OP17 box at the stores we track, in each market&apos;s own currency, before postage.</p>
              <SimpleTable head={["Market", "Cheapest box", "Stores"]} rows={marketRows} align={["l", "r", "r"]} />
            </>
          ) : (
            <p>No OP17 booster box is priced in our data right now; the <Link href="/sealed">sealed price list</Link> shows what is.</p>
          ),
        },
        {
          id: "products",
          title: "Every OP17 sealed product",
          body: productRows.length ? (
            <>
              <p>Boxes, packs and cases of OP17, with TCGplayer&apos;s market price and the cheapest listing in {c.place}.</p>
              <SimpleTable head={["Product", "Type", "Market (US$)", `Cheapest in ${c.code}`]} rows={productRows} align={["l", "l", "r", "r"]} />
              {pack?.marketUsd && perPack && pack.marketUsd > perPack ? (
                <p>
                  A single <Link href={`/sealed/${pack.slug}`}>OP17 booster pack</Link> costs {money(pack.marketUsd, "US")} — more than the box works out per pack.
                </p>
              ) : null}
              {caseP ? <p>A <Link href={`/sealed/${caseP.slug}`}>sealed OP17 case</Link> holds 12 boxes.</p> : null}
            </>
          ) : (
            <p>No OP17 sealed product is priced yet.</p>
          ),
        },
        {
          id: "chase",
          title: "The cards behind the OP17 box price",
          body: chase.length ? (
            <>
              <ul>
                {chase.map((x) => (
                  <li key={x.id}>
                    <Link href={`/card/${x.slug}`}>
                      {x.name} {x.number} price
                    </Link>{" "}
                    — {money(x.marketUsd, "US")}
                  </li>
                ))}
              </ul>
              <p>
                The full list is on the <Link href={`/sets/${set!.slug}`}>OP17 set price list</Link>, and our{" "}
                <Link href="/blog/op17-worlds-strongest-warriors-chase-cards">OP17 chase cards review</Link> covers them in more depth.
              </p>
              <Callout title="Is an OP17 box worth opening?">
                The <Link href="/tools/box-ev">box EV calculator</Link> sets the box price against what its pulls are worth on average.
              </Callout>
            </>
          ) : (
            <p>No OP17 single is priced yet.</p>
          ),
        },
      ],
    };
  },
};
