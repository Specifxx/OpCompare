import Link from "next/link";
import { Callout, CardGrid, CardTable, SimpleTable } from "@/components/blog/BlogBits";
import { COUNTRIES } from "../../country";
import { longDate, money } from "../../format";
import { PREORDER_PAGES } from "../../preorders";
import type { Post } from "../types";
import { byMarketDesc, plural } from "../util";
import {
  BANDAI_EB05,
  BANDAI_OP18,
  CardLink,
  ListByRarity,
  PrintingTable,
  READ_ON,
  boxSentence,
  cardName,
  chaseOrder,
  chasePrintings,
  empty,
  priceBit,
  rarityCounts,
  rarityLabel,
  setByCode,
  setCards,
  withArt,
} from "./set-reveal-shared";

// Set-reveal posts (owner, 24 October 2026): RiftCompare's best performers are
// "<set> signature cards"-style posts, so OP18, EB05 and OP17 get the same shape:
// a query-led title, real counts, a linked card list with images and prices, an
// FAQ. Cards, rarities, printings and prices are the catalogue's at render time
// (./set-reveal-shared.tsx). The typed facts are Bandai's English product pages,
// read on READ_ON and cited in each post:
//  - OP18 (BANDAI_OP18): 20 November 2026, US$4.99 MSRP per pack, "127+1 types in
//    total", Water Seven and the Holy Knights of God, Saint Gunko and Saint
//    Shamrock's debut; tournament legal 7 days after release. No rarity breakdown,
//    pack size or new keyword is printed, so none is stated.
//  - EB05 (BANDAI_EB05): 30 October 2026, US$4.99 per pack, "75+2 types in total",
//    Commons, Rares, Super Rares, Secret Rares, Leaders, Special Cards and DON!!,
//    "6 types of SP cards", and EB05-055 Nami drawn by Kentaro Yabuki in an alt-art
//    version. No pack size or box count is printed.
// Links to other posts are literal paths (this file is imported by lib/blog/index.ts).

const OP18_LIST = "/blog/op18-card-list";
const OP18_CHASE = "/blog/op18-chase-cards";
const EB05_LIST = "/blog/eb05-card-list";
const EB05_CHASE = "/blog/eb05-chase-cards";

function Source({ href, label }: { href: string; label: string }) {
  return (
    <p>
      <em>
        Source for release facts: <a href={href} rel="noopener" target="_blank">{label}</a>, read on {READ_ON}. Cards, rarities and prices: OP Compare&apos;s
        catalogue, from TCGplayer&apos;s listings and the stores we track, refreshed with every price import.
      </em>
    </p>
  );
}

// ---------------------------------------------------------------- OP18 chase

export const op18ChaseCards: Post = {
  slug: "op18-chase-cards",
  title: () => "OP18 Chase Cards: Secret Rares, Manga Rare & Alt Arts",
  description:
    "The chase cards revealed so far for One Piece OP18 The Dominance of God: Secret Rares, the Manga Rare and alt arts, with live pre-order prices.",
  tags: ["op18", "chase cards", "pre-order"],
  date: "2026-10-24",
  minutes: 5,
  faq: [
    {
      q: "What are the OP18 secret rares?",
      a: "The Secret Rares TCGplayer has listed so far are in the table on this page, each with its live price; the list fills in as more are revealed. Bandai's product page does not print a rarity breakdown.",
    },
    {
      q: "Is there a Manga Rare in OP18?",
      a: "Yes: TCGplayer lists a Manga printing in OP18, shown in the chase table on this page. Prices before release are pre-order prices and move daily.",
    },
    {
      q: "When does OP18 come out?",
      a: "Bandai's English product page dates OP-18, The Dominance of God, 20 November 2026, at an MSRP of US$4.99 per pack; cards are tournament legal 7 days after release. Pre-order prices are on [the OP18 pre-order board](/op18-preorders).",
    },
    {
      q: "How many cards are in OP18?",
      a: "Bandai's English product page says 127+1 types in total. [The OP18 set page](/sets/op18-the-dominance-of-god) shows every card TCGplayer has listed so far.",
    },
  ],
  related: [
    { href: "/sets/op18-the-dominance-of-god", label: "OP18 card list" },
    { href: PREORDER_PAGES.OP18, label: "OP18 pre-order prices" },
    { href: OP18_LIST, label: "Every revealed OP18 card" },
  ],
  build: ({ cat, sealed, country }) => {
    const set = setByCode(cat, "OP18");
    if (!set) return empty("OP18");
    const cards = setCards(cat, set);
    const chase = chaseOrder(chasePrintings(cards));
    const sec = cards.filter((c) => c.rarity === "SEC" && c.printing === "standard");
    const manga = cards.filter((c) => c.printing === "manga");
    const priced = cards.filter((c) => c.marketUsd != null).sort(byMarketDesc);
    return {
      heroCards: withArt(chase),
      summary: [
        <>
          <strong>{plural(cards.length, "OP18 printing")}</strong> are listed so far, of Bandai&apos;s 127+1 card types; {plural(chase.length, "chase printing")}{" "}
          (Secret Rare, Manga, SP or alt art) among them.
        </>,
        sec.length ? (
          <>
            <strong>Secret Rare{sec.length > 1 ? "s" : ""}:</strong>{" "}
            {sec.map((c, i) => (
              <span key={c.id}>
                {i ? ", " : ""}
                <CardLink c={c} /> ({c.number})
              </span>
            ))}
            .
          </>
        ) : null,
        manga.length ? (
          <>
            <strong>Manga Rare:</strong>{" "}
            {manga.map((c, i) => (
              <span key={c.id}>
                {i ? ", " : ""}
                <CardLink c={c} /> ({c.number})
              </span>
            ))}
            .
          </>
        ) : null,
        priced[0] ? (
          <>
            <strong>Highest pre-order price so far:</strong> <CardLink c={priced[0]} />, {priceBit(priced[0], country)}.
          </>
        ) : null,
        <>Out 20 November 2026 (Bandai), US$4.99 a pack.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>OP18, The Dominance of God</strong>, is the next One Piece booster set: Water Seven and the Holy Knights of God, with Saint Gunko and Saint
            Shamrock making their card game debut, by Bandai&apos;s product page. Here are the chase printings revealed so far — the Secret Rares, Manga Rare
            and alt arts — with what they cost to pre-order today. The list grows as cards are revealed, with no guessing in between.
          </p>
          <Source href={BANDAI_OP18} label="Bandai, BOOSTER PACK -THE DOMINANCE OF GOD- [OP-18]" />
        </>
      ),
      sections: [
        {
          id: "chase",
          title: "Every OP18 chase printing revealed so far",
          body: chase.length ? (
            <>
              <CardGrid cards={chase} setById={cat.setById} country={country} caption="Priced printings first, then Manga, alt art and Secret Rare" />
              <p>
                TCGplayer files some reprints under the set they come in, so a card with another set&apos;s number here is a reprint pulled from OP18 packs.
                Card images appear as TCGplayer lists them.
              </p>
            </>
          ) : (
            <p>No chase printing is listed yet.</p>
          ),
        },
        {
          id: "printings",
          title: "What is listed so far",
          body: (
            <>
              <PrintingTable cards={cards} />
              <p>
                By rarity (one per card number):{" "}
                {rarityCounts(cards)
                  .map(([r, n]) => `${n} ${rarityLabel(r)}${n === 1 ? "" : "s"}`)
                  .join(", ")}
                . The full list, card by card, is in <Link href={OP18_LIST}>our OP18 card list</Link>.
              </p>
            </>
          ),
        },
        {
          id: "buy",
          title: "Pre-ordering OP18",
          body: (
            <>
              <p>{boxSentence(set, sealed, country)} Bandai&apos;s MSRP is US$4.99 per pack.</p>
              <Callout title="Pre-order prices are not settled prices">
                Before release, single-card prices come from a handful of pre-order listings and often fall once boxes are opened. If you want one chase card,
                set a watch on its page rather than paying the first price.
              </Callout>
              <p>
                For the Leaders, read our guides to <Link href="/guides/op18-green-luffy-leader-deck-guide">green Luffy</Link>,{" "}
                <Link href="/guides/karoo-leader-guide-op18">Karoo</Link> and <Link href="/guides/saint-gunko-leader-guide-op18">Saint Gunko</Link>.
              </p>
            </>
          ),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------- OP18 list

export const op18CardList: Post = {
  slug: "op18-card-list",
  title: () => "OP18 Card List: Every Revealed Card & Price So Far",
  description: "Every One Piece OP18 The Dominance of God card revealed so far, by rarity, with images, Leaders and live pre-order prices in your currency.",
  tags: ["op18", "card list", "pre-order"],
  date: "2026-10-24",
  minutes: 6,
  faq: [
    {
      q: "How many cards are in OP18?",
      a: "Bandai's English product page says 127+1 types in total. This list shows the ones TCGplayer has listed so far and grows as more are revealed.",
    },
    {
      q: "Who are the OP18 Leaders?",
      a: "The Leaders listed so far are in the Leader table on this page, each linked to its own page. Guides: [green Luffy](/guides/op18-green-luffy-leader-deck-guide), [Karoo](/guides/karoo-leader-guide-op18) and [Saint Gunko](/guides/saint-gunko-leader-guide-op18).",
    },
    {
      q: "Does OP18 have new keywords?",
      a: "Bandai's product page does not announce one. Every keyword in the game is explained in [our keywords guide](/guides/one-piece-tcg-keywords-explained).",
    },
  ],
  related: [
    { href: "/sets/op18-the-dominance-of-god", label: "OP18 set page" },
    { href: OP18_CHASE, label: "OP18 chase cards" },
    { href: PREORDER_PAGES.OP18, label: "OP18 pre-order prices" },
  ],
  build: ({ cat, sealed, country }) => {
    const set = setByCode(cat, "OP18");
    if (!set) return empty("OP18");
    const cards = setCards(cat, set);
    const standard = cards.filter((c) => c.printing === "standard");
    const leaders = standard.filter((c) => c.cardType === "Leader").sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""));
    return {
      heroCards: withArt(chaseOrder(cards)),
      summary: [
        <>
          <strong>{plural(standard.length, "card")}</strong> of OP18&apos;s 127+1 (Bandai) are listed so far, plus {cards.length - standard.length} alt-art and Manga
          printings.
        </>,
        leaders.length ? (
          <>
            <strong>{plural(leaders.length, "Leader")}:</strong> {leaders.map((l) => l.name).join(", ")}.
          </>
        ) : null,
        <>Release: 20 November 2026 (Bandai); themes Water Seven and the Holy Knights of God.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            Here is every <strong>OP18 The Dominance of God</strong> card revealed so far, grouped by rarity, with its image and cheapest price where one is
            listed. It is read from our catalogue on every visit, so new reveals appear as TCGplayer lists them.
          </p>
          <Source href={BANDAI_OP18} label="Bandai, BOOSTER PACK -THE DOMINANCE OF GOD- [OP-18]" />
        </>
      ),
      sections: [
        {
          id: "leaders",
          title: "OP18 Leaders",
          body: leaders.length ? (
            <SimpleTable
              head={["Leader", "No.", "Colours", "Life", "Power"]}
              align={["l", "l", "l", "r", "r"]}
              rows={leaders.map((l) => [<CardLink key="n" c={l} />, l.number, l.colors.join("/"), l.life ?? "—", l.power ?? "—"])}
            />
          ) : (
            <p>No Leader is listed yet.</p>
          ),
        },
        { id: "list", title: "The OP18 card list by rarity", body: <ListByRarity cards={cards} cat={cat} country={country} /> },
        {
          id: "chase",
          title: "Chase printings",
          body: (
            <p>
              The Secret Rares, Manga Rare and alt arts are ranked in <Link href={OP18_CHASE}>OP18 chase cards</Link>. {boxSentence(set, sealed, country)}
            </p>
          ),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------- EB05 chase

export const eb05ChaseCards: Post = {
  slug: "eb05-chase-cards",
  title: () => "EB05 Chase Cards: SP, Manga & Secret Rare Prices",
  description:
    "The chase cards in One Piece EB05 Heroines Edition Vol. 2: Secret Rares, the Manga Rare, the 6 SP cards and alt arts, with live prices in your currency.",
  tags: ["eb05", "chase cards", "sealed"],
  date: "2026-10-24",
  minutes: 5,
  faq: [
    {
      q: "What are the EB05 chase cards?",
      a: "The Secret Rares, the Manga Rare, the SP cards and the alt arts, ranked in the table on this page by price where one is listed. Bandai's product page highlights 6 types of SP cards and an alt-art EB05-055 Nami drawn by Kentaro Yabuki.",
    },
    {
      q: "How many SP cards are in EB05?",
      a: "Bandai's English product page says 6 types of SP cards featuring special designs. The SP printings TCGplayer lists are in the chase table on this page.",
    },
    {
      q: "When does EB05 come out?",
      a: "Bandai's English product page dates EB-05, Extra Booster: One Piece Heroines Edition Vol. 2, 30 October 2026, at US$4.99 per pack. [The EB05 pre-order board](/eb05-preorders) compares pre-order prices by market.",
    },
    {
      q: "How many cards are in EB05?",
      a: "Bandai's product page says 75+2 types in total. [The EB05 set page](/sets/eb-05-extra-booster-one-piece-heroines-edition-vol-2) shows every one TCGplayer lists.",
    },
  ],
  related: [
    { href: "/sets/eb-05-extra-booster-one-piece-heroines-edition-vol-2", label: "EB05 set page" },
    { href: EB05_LIST, label: "EB05 card list" },
    { href: PREORDER_PAGES.EB05, label: "EB05 pre-order prices" },
  ],
  build: ({ cat, sealed, country }) => {
    const set = setByCode(cat, "EB05");
    if (!set) return empty("EB05");
    const cards = setCards(cat, set);
    const chase = chaseOrder(chasePrintings(cards));
    const sp = cards.filter((c) => c.printing === "sp");
    const manga = cards.filter((c) => c.printing === "manga");
    const sec = cards.filter((c) => c.rarity === "SEC");
    const priced = cards.filter((c) => c.marketUsd != null).sort(byMarketDesc);
    const nami = cards.filter((c) => c.number === "EB05-055");
    return {
      heroCards: withArt(chase),
      summary: [
        <>
          <strong>{plural(chase.length, "chase printing")}</strong> in EB05: {plural(sec.length, "Secret Rare printing")}, {plural(manga.length, "Manga Rare")},{" "}
          {plural(sp.length, "SP printing")} and the rest alt arts.
        </>,
        priced[0] ? (
          <>
            <strong>Dearest card on TCGplayer today:</strong> <CardLink c={priced[0]} />, {priceBit(priced[0], country)}.
          </>
        ) : null,
        <>Bandai: 75+2 card types, &ldquo;6 types of SP cards&rdquo;, out 30 October 2026 at US$4.99 a pack.</>,
      ].filter(Boolean),
      lede: (
        <>
          <p>
            <strong>EB05, Extra Booster: One Piece Heroines Edition Vol. 2</strong>, is a set of the series&apos; heroines led by a new Nico Robin Leader
            (EB05-010). Its chase is the Secret Rare, the Manga Rare, six SP cards and a run of alt arts — including an EB05-055 Nami alt art drawn by Kentaro
            Yabuki, by Bandai&apos;s product page. Here is every one, with its price today.
          </p>
          <Source href={BANDAI_EB05} label="Bandai, EXTRA BOOSTER -ONE PIECE HEROINES EDITION vol.2- [EB-05]" />
        </>
      ),
      sections: [
        { id: "chase", title: "Every EB05 chase printing", body: <CardGrid cards={chase} setById={cat.setById} country={country} caption="Priced printings first, then Manga, SP, alt art and Secret Rare" /> },
        {
          id: "sp",
          title: "The EB05 SP cards",
          body: sp.length ? (
            <>
              <p>
                Bandai prints &ldquo;6 types of SP cards featuring special designs&rdquo;. TCGplayer lists {plural(sp.length, "SP printing")} in the set; most reprint
                a heroine from an earlier set with new art, which is why their numbers are not EB05&apos;s:
              </p>
              <ul>
                {sp.map((c) => (
                  <li key={c.id}>
                    <CardLink c={c} /> ({c.number}, {c.rarity}) — {priceBit(c, country)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No SP printing is listed yet.</p>
          ),
        },
        {
          id: "nami",
          title: "The Kentaro Yabuki Nami (EB05-055)",
          body: (
            <p>
              Bandai&apos;s product page shows EB05-055 Nami in a normal version and an alt-art version illustrated by Kentaro Yabuki, the artist of Black Cat.
              {nami.length ? (
                <>
                  {" "}
                  Both printings:{" "}
                  {nami.map((c, i) => (
                    <span key={c.id}>
                      {i ? "; " : ""}
                      <CardLink c={c} /> — {priceBit(c, country)}
                    </span>
                  ))}
                  .
                </>
              ) : null}
            </p>
          ),
        },
        {
          id: "buy",
          title: "Box or singles?",
          body: (
            <>
              <p>{boxSentence(set, sealed, country)}</p>
              <Callout title="Our view">
                A box gives you a shot at the chase, not a promise of it. If you want one heroine, her single is almost always cheaper than chasing her in packs.
                Every card is in <Link href={EB05_LIST}>the EB05 card list</Link>, and <Link href="/blog/where-to-buy-one-piece-eb05">where to buy EB05</Link>{" "}
                compares sealed prices by market.
              </Callout>
            </>
          ),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------- EB05 list

export const eb05CardList: Post = {
  slug: "eb05-card-list",
  title: () => "EB05 Card List: All Heroines Vol. 2 Cards & Prices",
  description: "The full One Piece EB05 Heroines Edition Vol. 2 card list: every card by rarity with images, the Leaders, alt arts and SPs, and live prices.",
  tags: ["eb05", "card list"],
  date: "2026-10-24",
  minutes: 6,
  faq: [
    {
      q: "How many cards are in EB05?",
      a: "Bandai's English product page says 75+2 types in total, in Commons, Rares, Super Rares, Secret Rares, Leaders, Special Cards and DON!! cards. This list counts the printings TCGplayer lists, including alt arts and SPs.",
    },
    {
      q: "Who is the EB05 Leader?",
      a: "Bandai's product page features a new Nico Robin Leader, EB05-010. Every Leader TCGplayer lists in the set is in the Leader table on this page.",
    },
    {
      q: "What are the most valuable EB05 cards?",
      a: "Our EB05 chase cards post ranks them by live price; [the EB05 set page](/sets/eb-05-extra-booster-one-piece-heroines-edition-vol-2) sorts every card by price.",
    },
  ],
  related: [
    { href: "/sets/eb-05-extra-booster-one-piece-heroines-edition-vol-2", label: "EB05 set page" },
    { href: EB05_CHASE, label: "EB05 chase cards" },
    { href: PREORDER_PAGES.EB05, label: "EB05 pre-order prices" },
  ],
  build: ({ cat, sealed, country }) => {
    const set = setByCode(cat, "EB05");
    if (!set) return empty("EB05");
    const cards = setCards(cat, set);
    const own = cards.filter((c) => c.number?.startsWith("EB05-"));
    const standard = own.filter((c) => c.printing === "standard");
    const leaders = cards.filter((c) => c.cardType === "Leader").sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""));
    return {
      heroCards: withArt(chaseOrder(chasePrintings(cards))),
      summary: [
        <>
          <strong>{plural(standard.length, "EB05-numbered card")}</strong> in their standard print, {plural(cards.length, "printing")} in all on TCGplayer (alt arts,
          SPs, the Manga Rare and reprints included). Bandai counts 75+2 types.
        </>,
        <>
          By rarity:{" "}
          {rarityCounts(own)
            .map(([r, n]) => `${n} ${r}`)
            .join(", ")}
          .
        </>,
        <>Out 30 October 2026 (Bandai), US$4.99 a pack.</>,
      ],
      lede: (
        <>
          <p>
            The complete <strong>EB05 Heroines Edition Vol. 2</strong> card list, by rarity, with every card&apos;s image and cheapest price in your currency.
            Alt arts, SPs and reprints are listed after the standard cards.
          </p>
          <Source href={BANDAI_EB05} label="Bandai, EXTRA BOOSTER -ONE PIECE HEROINES EDITION vol.2- [EB-05]" />
        </>
      ),
      sections: [
        {
          id: "leaders",
          title: "EB05 Leaders (every printing)",
          body: (
            <SimpleTable
              head={["Leader", "No.", "Colours", "Price"]}
              align={["l", "l", "l", "l"]}
              rows={leaders.map((l) => [<CardLink key="n" c={l} />, l.number, l.colors.join("/"), priceBit(l, country)])}
            />
          ),
        },
        { id: "list", title: "The EB05 card list by rarity", body: <ListByRarity cards={own} cat={cat} country={country} /> },
        {
          id: "alt",
          title: "Alt arts, SPs, Manga and reprints",
          body: (
            <>
              <CardGrid cards={chaseOrder(cards.filter((c) => c.printing !== "standard"))} setById={cat.setById} country={country} />
              <PrintingTable cards={cards} />
              <p>{boxSentence(set, sealed, country)}</p>
            </>
          ),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------- OP17 top 20

export const op17MostValuable: Post = {
  slug: "op17-most-valuable-cards",
  title: () => "OP17 Most Valuable Cards: Top 20 by Price",
  description:
    "The 20 most valuable cards in One Piece OP17 The World's Strongest Warriors, from live TCGplayer and store prices: Super Alt Arts, Manga Rares and SPs.",
  tags: ["op17", "chase cards", "market"],
  date: "2026-10-24",
  minutes: 5,
  faq: [
    {
      q: "What is the most expensive OP17 card?",
      a: "The first row of the table on this page, read from TCGplayer's market price on every visit, so it is always current.",
    },
    {
      q: "Which OP17 cards are Manga Rares?",
      a: "Every Manga printing in OP17 is listed in the Manga section of this page with its price.",
    },
    {
      q: "Is an OP17 booster box worth it?",
      a: "Our OP17 chase cards and box review covers it in full: the value is concentrated in a handful of printings, so singles are usually cheaper for a card you want.",
    },
  ],
  related: [
    { href: "/sets/op17-the-worlds-strongest-warriors", label: "OP17 card list" },
    { href: "/blog/op17-worlds-strongest-warriors-chase-cards", label: "OP17 box review" },
    { href: "/tools/box-ev", label: "Box EV calculator" },
  ],
  build: ({ cat, sealed, country }) => {
    const set = setByCode(cat, "OP17");
    if (!set) return empty("OP17");
    const cards = setCards(cat, set);
    const valued = cards.filter((c) => c.marketUsd != null && c.printing !== "promo").sort(byMarketDesc);
    const top = valued.slice(0, 20);
    const total = valued.reduce((a, c) => a + c.marketUsd!, 0);
    const topSum = top.reduce((a, c) => a + c.marketUsd!, 0);
    const manga = valued.filter((c) => c.printing === "manga");
    const kinds = new Map<string, number>();
    for (const c of top) kinds.set(c.printing, (kinds.get(c.printing) ?? 0) + 1);
    const m = COUNTRIES[country];
    return {
      heroCards: top.slice(0, 3),
      summary: [
        top[0] ? (
          <>
            <strong>Most valuable:</strong> <CardLink c={top[0]} /> ({top[0].number}) at {money(top[0].marketUsd, "US")} on TCGplayer.
          </>
        ) : null,
        total ? (
          <>
            <strong>The top 20 hold {Math.round((topSum / total) * 100)}%</strong> of OP17&apos;s value ({money(total, "US")} across {valued.length} priced
            printings).
          </>
        ) : null,
        manga.length ? (
          <>
            <strong>{plural(manga.length, "Manga Rare")}</strong>, the dearest {cardName(manga[0])} at {money(manga[0].marketUsd, "US")}.
          </>
        ) : null,
        <>Released {longDate(set.releasedOn)}; prices refresh daily.</>,
      ].filter(Boolean),
      lede: (
        <p>
          <strong>OP17, The World&apos;s Strongest Warriors</strong>, is the newest One Piece booster set on shelves. These are its 20 most valuable cards today,
          by TCGplayer&apos;s market price, with the cheapest copy we track in {m.place} beside each — read on every visit, never typed.
        </p>
      ),
      sections: [
        { id: "top", title: "The 20 most valuable OP17 cards", body: <CardTable cards={top} setById={cat.setById} country={country} /> },
        {
          id: "what",
          title: "What the top 20 is made of",
          body: (
            <>
              <PrintingTable cards={top} />
              <p>
                TCGplayer files some SP reprints of older cards under OP17 because they are pulled from OP17 packs, so a few numbers above belong to other sets.
              </p>
            </>
          ),
        },
        {
          id: "manga",
          title: "Every OP17 Manga Rare",
          body: manga.length ? <CardTable cards={manga} setById={cat.setById} country={country} /> : <p>No Manga printing is priced yet.</p>,
        },
        {
          id: "box",
          title: "Should you open OP17?",
          body: (
            <p>
              {boxSentence(set, sealed, country)} For the full box maths, read <Link href="/blog/op17-worlds-strongest-warriors-chase-cards">our OP17 review</Link>{" "}
              or try the <Link href="/tools/box-ev">box EV calculator</Link>. Next up: <Link href={EB05_CHASE}>EB05&apos;s chase cards</Link> and{" "}
              <Link href={OP18_CHASE}>OP18&apos;s</Link>.
            </p>
          ),
        },
      ],
    };
  },
};
