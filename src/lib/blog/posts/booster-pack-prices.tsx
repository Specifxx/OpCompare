import Link from "next/link";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { money } from "../../format";
import { headline } from "../../price";
import type { Post } from "../types";
import { byMarketDesc, monthYear } from "../util";

// One query: "one piece booster pack price". Every figure is read from the
// snapshot at render; a row prints only for a pack with a price.
export const boosterPackPrices: Post = {
  slug: "one-piece-booster-pack-price",
  title: ({ cat }) => `One Piece Booster Pack Price by Set (${monthYear(cat.pricesAt)})`,
  description:
    "What a One Piece booster pack costs in every set: the single-pack price beside the box's cost per pack, so you can see when buying the box is cheaper.",
  tags: ["sealed", "booster pack", "prices"],
  date: "2026-10-23",
  category: "guide",
  minutes: 4,
  related: [
    { href: "/sealed", label: "Every sealed product" },
    { href: "/guides/op17-booster-box-price", label: "OP17 booster box price" },
    { href: "/tools/box-ev", label: "Box EV calculator" },
  ],
  faq: [
    {
      q: "Is it cheaper to buy One Piece packs or a booster box?",
      a: "Usually the box. A main-set box holds 24 packs, and its price divided by 24 is in most sets below the price of a single pack. The table on this page sets the two side by side for every set.",
    },
  ],
  build: ({ cat, sealed, country }) => {
    const c = COUNTRIES[country];
    const today = new Date().toISOString().slice(0, 10);
    const rows = sealed
      .filter((s) => s.kind === "Booster Pack" && s.marketUsd != null && s.setId != null)
      .map((s) => {
        const set = cat.setById.get(s.setId!);
        const box = sealed.find((b) => b.setId === s.setId && b.kind === "Booster Box");
        const perPack = box?.marketUsd && box.packCount ? Math.round(box.marketUsd / box.packCount) : null;
        return { s, set, box, perPack };
      })
      .filter((r) => r.set && (!r.set.releasedOn || r.set.releasedOn <= today))
      .sort((a, b) => (b.set!.releasedOn ?? "").localeCompare(a.set!.releasedOn ?? ""));
    const cheapest = [...rows].sort((a, b) => a.s.marketUsd! - b.s.marketUsd!)[0];
    const dearest = [...rows].sort((a, b) => b.s.marketUsd! - a.s.marketUsd!)[0];
    const boxWins = rows.filter((r) => r.perPack != null && r.perPack < r.s.marketUsd!).length;
    const withBox = rows.filter((r) => r.perPack != null).length;
    const heroSet = rows[0]?.set;
    const heroCards = heroSet ? cat.cards.filter((x) => x.setId === heroSet.id).sort(byMarketDesc).slice(0, 3) : [];
    const tableRows = rows.map(({ s, set, box, perPack }) => {
      const h = headline(s, country);
      return [
        <Link key="n" href={`/sealed/${s.slug}`}>
          {set!.name} booster pack <span className="text-xs text-slate-500">{set!.code}</span>
        </Link>,
        money(s.marketUsd, "US"),
        perPack && box ? <Link key="b" href={`/sealed/${box.slug}`}>{money(perPack, "US")}</Link> : "—",
        h.kind === "listing" ? money(h.cents, country) : "—",
      ];
    });
    return {
      heroCards,
      summary: [
        cheapest ? (
          <>
            <strong>Cheapest One Piece booster pack:</strong> <Link href={`/sealed/${cheapest.s.slug}`}>{cheapest.set!.name}</Link> at {money(cheapest.s.marketUsd, "US")}.
          </>
        ) : null,
        dearest ? (
          <>
            <strong>Most expensive pack:</strong> <Link href={`/sealed/${dearest.s.slug}`}>{dearest.set!.name}</Link> at {money(dearest.s.marketUsd, "US")}.
          </>
        ) : null,
        withBox ? (
          <>
            In <strong>{boxWins} of {withBox}</strong> sets with a priced box, the box costs less per pack than buying packs one at a time.
          </>
        ) : null,
      ].filter(Boolean),
      lede: (
        <p>
          <strong>A One Piece booster pack price</strong> depends on the set: a pack from a set still in print sells close to retail, an out-of-print one for
          several times that. This guide lists every English booster pack we price, newest first, with TCGplayer&apos;s market price, the matching box&apos;s cost
          per pack and the cheapest pack in stock in {c.place}.
        </p>
      ),
      sections: [
        {
          id: "table",
          title: "One Piece booster pack prices, set by set",
          body: (
            <>
              <p>“Box per pack” is the box&apos;s TCGplayer market price divided by its 24 packs, linked to that box&apos;s price comparison.</p>
              <SimpleTable head={["Pack", "Market (US$)", "Box per pack", `Cheapest in ${c.code}`]} rows={tableRows} align={["l", "r", "r", "r"]} />
            </>
          ),
        },
        {
          id: "packs-or-box",
          title: "Packs or a box?",
          body: (
            <>
              <p>
                Loose packs cost more per pack, but cost less to try a set. If you want specific cards, buying the singles is almost always cheaper than
                opening for them — every card&apos;s page compares the stores that stock it. Our <Link href="/blog/one-piece-booster-box-prices">booster box price
                list</Link> has every box side by side.
              </p>
              <Callout title="Check the language">Japanese packs are a different product at a different price; every pack here is English.</Callout>
            </>
          ),
        },
      ],
    };
  },
};
