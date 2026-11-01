import Link from "next/link";
import { CardLink, SimpleTable } from "@/components/blog/BlogBits";
import type { CardLite } from "../../data";
import { int, money } from "../../format";
import { median } from "../../selectors";
import { traitHubs } from "../../traits";
import type { Post } from "../types";

// The crews and factions post (2026-11-01): every type with its own hub
// (/cards/trait/[slug]) compared by size, median and $10+ printings. It links
// the hubs and never lists their cards, so it doesn't compete with them.
export const crews: Post = {
  slug: "one-piece-card-game-crews-most-valuable",
  category: "guide",
  title: () => "One Piece TCG Crews & Factions: Which Types Cost the Most?",
  description: "Straw Hat Crew, Navy, Whitebeard Pirates and every other One Piece Card Game type compared by cards, median price and $10+ printings. Live prices.",
  tags: ["guide", "types", "collecting"],
  date: "2026-11-01",
  minutes: 5,
  related: [
    { href: "/cards/trait", label: "Every card type" },
    { href: "/leaders", label: "Every Leader" },
    { href: "/colors", label: "Cards by colour" },
  ],
  build: ({ cat, text }) => {
    const hubs = text ? traitHubs(text) : [];
    const byNumber = new Map<string, CardLite[]>();
    for (const c of cat.cards) if (c.number && c.printing !== "don") (byNumber.get(c.number) ?? byNumber.set(c.number, []).get(c.number)!).push(c);
    const rows = hubs.map((h) => {
      const prints = [...h.numbers].flatMap((n) => byNumber.get(n) ?? []);
      const std = [...h.numbers].map((n) => (byNumber.get(n) ?? []).find((c) => c.printing === "standard")).filter((c): c is CardLite => !!c);
      const top = [...prints].sort((a, b) => (b.marketUsd ?? -1) - (a.marketUsd ?? -1))[0];
      return {
        h,
        prints: prints.length,
        med: median(std.map((c) => c.marketUsd).filter((v): v is number => v != null)),
        over10: prints.filter((c) => (c.marketUsd ?? 0) >= 1000).length,
        leaders: std.filter((c) => c.cardType === "Leader").length,
        top,
      };
    });
    const big = rows.slice(0, 25);
    const priciest = [...rows].filter((r) => r.h.numbers.size >= 20 && r.med != null).sort((a, b) => b.med! - a.med!).slice(0, 5);
    const share = (r: (typeof rows)[number]) => (r.prints ? r.over10 / r.prints : 0);
    const richest = [...rows].filter((r) => r.h.numbers.size >= 20).sort((a, b) => share(b) - share(a)).slice(0, 8);
    const straw = rows.find((r) => r.h.slug === "straw-hat-crew");
    const table = (list: typeof rows) => (
      <SimpleTable
        head={["Type", "Cards", "Printings", "Median (standard)", "$10+ printings", "Most valuable"]}
        align={["l", "r", "r", "r", "r", "l"]}
        rows={list.map((r) => [
          <Link key={r.h.slug} href={`/cards/trait/${r.h.slug}`}>{r.h.name}</Link>,
          int(r.h.numbers.size),
          int(r.prints),
          money(r.med, "US"),
          int(r.over10),
          r.top ? <span key="t"><CardLink c={r.top} /> {money(r.top.marketUsd, "US")}</span> : "—",
        ])}
      />
    );
    return {
      heroCards: rows.slice(0, 3).map((r) => r.top).filter((c): c is CardLite => !!c),
      summary: [
        straw ? <><strong>Straw Hat Crew</strong> is by far the biggest type: {int(straw.h.numbers.size)} cards and {int(straw.prints)} printings, {int(straw.over10)} of them worth $10 or more.</> : null,
        priciest[0] ? <>Typical cards are cheap: even <strong>{priciest[0].h.name}</strong>, the type with the dearest median standard print, is only {money(priciest[0].med, "US")}.</> : null,
        richest[0] ? <>A crew gets expensive through its alternate arts, manga rares and SPs: <strong>{Math.round(share(richest[0]) * 100)}%</strong> of {richest[0].h.name} printings are worth $10 or more, the highest share of any big type.</> : null,
        <>Every figure is today&apos;s TCGplayer market price, recomputed as prices update.</>,
      ].filter(Boolean),
      lede: (
        <p>
          <strong>Every One Piece card has a type</strong>, the crew, faction or place printed under its name: Straw Hat Crew, Navy, Whitebeard Pirates, Land of Wano. Many
          Leaders reward a deck of one type, and plenty of collectors build a binder around their favourite crew. So which types are the most expensive to collect? Here
          are the {int(hubs.length)} types with enough cards for their own price list, compared.
        </p>
      ),
      sections: hubs.length
        ? [
            {
              id: "biggest",
              title: "The 25 biggest types",
              body: (
                <>
                  <p>
                    Cards counts card numbers, printings counts every version of them. The median is the standard print&apos;s TCGplayer market price, so one rare
                    printing can&apos;t skew it; the $10+ column is where the cost of a complete crew really sits. Click a type for every card in it.
                  </p>
                  {table(big)}
                </>
              ),
            },
            {
              id: "where-the-money-is",
              title: "Where the money is",
              body: (
                <>
                  <p>
                    Types with at least 20 cards, ranked by the share of their printings worth $10 or more. These are the crews whose collections cost the most to
                    complete, because so many of their cards come in premium printings:
                  </p>
                  {table(richest)}
                </>
              ),
            },
            {
              id: "the-rest",
              title: "Every other type",
              body: (
                <>
                  {table(rows.slice(25))}
                  <p>
                    Types with fewer than a dozen cards have no page yet; search them in the <Link href="/browse">card database</Link>.
                  </p>
                </>
              ),
            },
            {
              id: "collect-for-less",
              title: "Collect a crew for less",
              body: (
                <ol>
                  <li>Open the type and decide which printings you want; the standard prints of most crews cost cents.</li>
                  <li>
                    Paste the list into the <Link href="/tools/best-basket">best basket</Link> tool for the cheapest mix of stores, shipping included.
                  </li>
                  <li>
                    Building a deck around a type? Start from its Leader on the <Link href="/leaders">Leaders page</Link>, and check the{" "}
                    <Link href="/blog/cheapest-one-piece-leaders">cheapest Leaders by colour</Link>.
                  </li>
                </ol>
              ),
            },
          ]
        : [{ id: "types", title: "Every card type", body: <p>See <Link href="/cards/trait">every One Piece card type</Link> with its own price list.</p> }],
    };
  },
  faq: [
    { q: "What is the biggest type in the One Piece Card Game?", a: "Straw Hat Crew, with well over 400 card numbers. Navy, Supernovas and Land of Wano follow." },
    { q: "What is a type on a One Piece card?", a: "The crew, faction or place printed under the card's name, such as Straw Hat Crew or Navy. Many Leaders and effects refer to it." },
  ],
};
