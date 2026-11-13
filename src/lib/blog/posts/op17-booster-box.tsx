import Link from "next/link";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES, MARKETS } from "../../country";
import { money, shortDate } from "../../format";
import { headline } from "../../price";
import type { Post } from "../types";
import { byMarketDesc, monthYear } from "../util";

// One query, one page: "op17 booster box price" (and, from 2026-11-13, "op18 booster box price": the same page for the
// set released on 20 Nov, so it exists before buyers search it). Every figure is read from the snapshot at render (the
// same sealed catalogue the /sealed pages show), and a sentence that needs a fact prints only when the fact exists.
interface BoxSpec {
  code: string;
  /** The set's English name as the description and FAQ print it. */
  name: string;
  slug: string;
  date: string;
  /** The chase-cards post the last section links to. */
  chase: { href: string; label: string };
  /** The set's own pre-order board, linked while the set is unreleased. */
  preorders?: string;
}

const boxPost = ({ code: CODE, name, slug, date, chase: chasePost, preorders }: BoxSpec): Post => ({
  slug,
  title: ({ cat }) => `${CODE} Booster Box Price Today (${monthYear(cat.pricesAt)})`,
  description: `What an ${CODE} ${name} booster box costs right now: TCGplayer market price, the cheapest in-stock box in each market, cost per pack, and the cards that drive it.`,
  tags: ["sealed", "booster box", CODE, "prices"],
  date,
  category: "guide",
  minutes: 4,
  related: [
    ...(preorders ? [{ href: preorders, label: `${CODE} pre-order prices` }] : []),
    { href: "/sealed", label: "Every sealed product" },
    { href: "/tools/box-ev", label: "Box EV calculator" },
    { href: "/release-dates", label: "Release dates" },
  ],
  faq: [
    {
      q: `How many packs are in an ${CODE} booster box?`,
      a: `An English ${CODE} (${name}) booster box holds 24 booster packs, like every main One Piece Card Game booster set.`,
    },
    {
      q: `Is the ${CODE} box price on this page live?`,
      a: "Yes. The figures are rebuilt from OP Compare's price data after each import: TCGplayer's market price plus the cheapest in-stock listing at the stores we track in each market.",
    },
  ],
  build: ({ cat, sealed, country }) => {
    const c = COUNTRIES[country];
    const set = cat.sets.find((s) => s.code === CODE);
    const unreleased = !set?.releasedOn || String(set.releasedOn).slice(0, 10) > new Date().toISOString().slice(0, 10);
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
            <strong>{CODE} booster box market price:</strong> {money(box.marketUsd, "US")} on TCGplayer
            {perPack ? <> — about {money(perPack, "US")} a pack</> : null}.
          </>
        ) : null,
        boxH?.kind === "listing" ? (
          <>
            <strong>Cheapest in-stock box in {c.place}:</strong> {money(boxH.cents, country)} across {boxH.stores} {boxH.stores === 1 ? "store" : "stores"} —{" "}
            <Link href={`/sealed/${box!.slug}`}>compare every {CODE} box listing</Link>.
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
          <strong>The {CODE} booster box price</strong> — {name}{set?.releasedOn ? `, ${set.releasedOn.slice(0, 10) > new Date().toISOString().slice(0, 10) ? "out" : "released"} ${shortDate(set.releasedOn)}` : ""} — is shown
          here two ways: TCGplayer&apos;s US market price, and the cheapest box actually in stock at the stores OP Compare tracks in each market. Both come
          from the same data as the <Link href={box ? `/sealed/${box.slug}` : "/sealed"}>{CODE} booster box page</Link>.
          {preorders && unreleased ? (
            <>
              {" "}Until release day, every store&apos;s pre-order price is on the <Link href={preorders}>{CODE} pre-order board</Link>.
            </>
          ) : null}
        </p>
      ),
      sections: [
        {
          id: "by-market",
          title: `${CODE} booster box price in every market`,
          body: marketRows.length ? (
            <>
              <p>The cheapest in-stock English {CODE} box at the stores we track, in each market&apos;s own currency, before postage.</p>
              <SimpleTable head={["Market", "Cheapest box", "Stores"]} rows={marketRows} align={["l", "r", "r"]} />
            </>
          ) : (
            <p>No {CODE} booster box is priced in our data right now; the <Link href="/sealed">sealed price list</Link> shows what is.</p>
          ),
        },
        {
          id: "products",
          title: `Every ${CODE} sealed product`,
          body: productRows.length ? (
            <>
              <p>Boxes, packs and cases of {CODE}, with TCGplayer&apos;s market price and the cheapest listing in {c.place}.</p>
              <SimpleTable head={["Product", "Type", "Market (US$)", `Cheapest in ${c.code}`]} rows={productRows} align={["l", "l", "r", "r"]} />
              {pack?.marketUsd && perPack && pack.marketUsd > perPack ? (
                <p>
                  A single <Link href={`/sealed/${pack.slug}`}>{CODE} booster pack</Link> costs {money(pack.marketUsd, "US")} — more than the box works out per pack.
                </p>
              ) : null}
              {caseP ? <p>A <Link href={`/sealed/${caseP.slug}`}>sealed {CODE} case</Link> holds 12 boxes.</p> : null}
            </>
          ) : (
            <p>No {CODE} sealed product is priced yet.</p>
          ),
        },
        {
          id: "chase",
          title: `The cards behind the ${CODE} box price`,
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
                The full list is on the <Link href={`/sets/${set!.slug}`}>{CODE} set price list</Link>, and our{" "}
                <Link href={chasePost.href}>{chasePost.label}</Link> covers them in more depth.
              </p>
              <Callout title={`Is an ${CODE} box worth opening?`}>
                The <Link href="/tools/box-ev">box EV calculator</Link> sets the box price against what its pulls are worth on average.
              </Callout>
            </>
          ) : (
            <p>No {CODE} single is priced yet.</p>
          ),
        },
      ],
    };
  },
});

export const op17BoosterBox = boxPost({
  code: "OP17",
  name: "The World's Strongest Warriors",
  slug: "op17-booster-box-price",
  date: "2026-10-23",
  chase: { href: "/blog/op17-worlds-strongest-warriors-chase-cards", label: "OP17 chase cards review" },
});

export const op18BoosterBox = boxPost({
  code: "OP18",
  name: "The Dominance of God",
  slug: "op18-booster-box-price",
  date: "2026-11-13",
  chase: { href: "/blog/op18-chase-cards", label: "OP18 chase cards list" },
  preorders: "/op18-preorders",
});
