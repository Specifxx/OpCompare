import Link from "next/link";
import { CardTable, Callout, SimpleTable } from "@/components/blog/BlogBits";
import { money } from "../../format";
import type { Post } from "../types";
import { byMarketDesc, packPullable } from "../util";

// Evergreen guide: how to tell a counterfeit One Piece card from a real one.
// The checks are the ones collectors and stores use; the price table is live,
// because the cards worth faking are the cards worth the most.
export const fakeCards: Post = {
  slug: "how-to-spot-fake-one-piece-cards",
  title: () => "How to Spot Fake One Piece Cards: 8 Checks Before You Buy",
  description:
    "The eight checks that separate a counterfeit One Piece card from a real Bandai print: the back, the holo, the texture, the font, the light test and the price. Plus the cards most worth checking, with today's prices.",
  tags: ["guide", "collecting", "buying"],
  category: "guide",
  faq: [
    {
      q: "What is the quickest way to spot a fake One Piece card?",
      a: "Put it next to a common from the same set and compare the back. Counterfeits almost always get the card back wrong: the blue is too dark or too purple, the Bandai logo and the small text are soft, and the border is thinner or thicker than the real card's. The light test (a phone torch behind the card) is the second check: a real card's black core lets almost no light through.",
    },
    {
      q: "Are fake One Piece cards common?",
      a: "On marketplaces and at the cheap end of social media sales, yes, especially for Manga rares, SP cards and alternate-art Leaders. At a store that opens its own product, almost never. The counterfeits are of the cards worth faking, which is why the chase cards get checked and the commons do not.",
    },
    {
      q: "Can a fake card be graded?",
      a: "Grading companies reject counterfeits, so a card already in a PSA, BGS or CGC slab has passed that check. Check the slab's certification number on the grader's own site, because fake slabs exist too.",
    },
    {
      q: "Is a card with a different font or a misprint always fake?",
      a: "No. Bandai's own print runs have real misprints and miscuts, and the English, Japanese and Chinese versions use different fonts and layouts. A card is suspect when it differs from a known-real copy of the same printing and language, not when it differs from another language's version.",
    },
    {
      q: "What should I do if a card I bought is fake?",
      a: "Ask for a refund with photos. eBay's and PayPal's buyer protections treat a counterfeit as 'not as described'; a store will usually refund without argument. Do not resell it, even as a proxy with a disclosure, because it will be resold again without one.",
    },
  ],
  date: "2026-11-05",
  minutes: 8,
  related: [
    { href: "/blog/most-expensive-one-piece-cards", label: "Most expensive cards" },
    { href: "/guides/one-piece-card-rarities-explained", label: "Rarities explained" },
    { href: "/stores", label: "Stores we track" },
  ],
  build: ({ cat, country, stats }) => {
    const pullable = packPullable(cat).filter((c) => c.marketUsd != null).sort(byMarketDesc);
    const top = pullable.slice(0, 10);
    const set = (id: number) => cat.setById.get(id);
    const first = top[0];
    const hundredPlus = pullable.filter((c) => (c.marketUsd ?? 0) >= 10000).length;
    const stores = new Set(stats.storeOffers.filter((s) => s.source !== "tcgplayer").map((s) => s.source)).size;
    return {
      heroCards: top.slice(0, 3),
      summary: [
        <>
          <strong>Start with the back.</strong> Counterfeits get the blue, the logo and the border wrong far more often than they get the front wrong, and you can compare it with any common from the same set.
        </>,
        <>
          <strong>Then the light test.</strong> A real Bandai card has a dark core: hold a phone torch behind it and almost nothing comes through. Most fakes glow.
        </>,
        first ? (
          <>
            <strong>The cards worth checking are the expensive ones.</strong> {first.name}
            {first.variant ? ` (${first.variant})` : ""} is {money(first.marketUsd, "US")} on TCGplayer today, and {hundredPlus.toLocaleString("en-US")} pack-pullable printings are worth US$100 or more.
          </>
        ) : null,
        <>
          <strong>A price far under every store is the first warning,</strong> not a bargain. The table below shows the cheapest real store price for each chase card, so you know what &ldquo;too cheap&rdquo; means.
        </>,
      ].filter(Boolean),
      lede: (
        <p>
          <strong>Counterfeit One Piece cards are a problem in direct proportion to price.</strong> Nobody fakes a common; the Manga rares, SP cards, alternate-art Leaders
          and Treasure Rares at the top of the market are the ones that turn up as fakes on marketplaces, in social-media sales and occasionally in a bulk lot. The
          checks below are the ones stores and graders use. None needs equipment beyond a phone torch and a real card to compare against, and together they catch
          almost every counterfeit on the market today.
        </p>
      ),
      sections: [
        {
          id: "checks",
          title: "The eight checks, in the order to do them",
          body: (
            <>
              <ol>
                <li>
                  <strong>The back.</strong> Every real One Piece card has the same back: a specific mid blue, a crisp Bandai logo, sharp small text and an even
                  border. Put the suspect card beside a common from any set. A back that is darker, more purple, blurrier or has a different border width is a fake,
                  whatever the front looks like. This single check catches most counterfeits.
                </li>
                <li>
                  <strong>The light test.</strong> Hold a phone torch flat against the back and look at the front in a dark room. Bandai&apos;s card stock has a dark
                  core layer, so very little light passes through and the card looks nearly opaque. A fake printed on plain card glows, often enough to see the
                  art from behind.
                </li>
                <li>
                  <strong>The holo pattern.</strong> On a real foil the pattern is fine, even and sits under the ink, so the art stays sharp as you tilt it. Fakes
                  use a coarse rainbow foil, a pattern that runs over the text, or a &ldquo;holo&rdquo; that is a printed sparkle with no movement at all. Compare
                  with a real foil of the same rarity, because each rarity has its own treatment: the <Link href="/guides/one-piece-card-rarities-explained">rarities guide</Link> shows which cards are foil and which are not.
                </li>
                <li>
                  <strong>Texture and thickness.</strong> Real cards have a slight texture and a firm snap; a fake is often glossier, thinner or softer, and a stack
                  of them is noticeably shorter than a stack of real cards. If you have ten real commons, weigh them against ten suspect cards on a kitchen scale.
                </li>
                <li>
                  <strong>The font and the text.</strong> Counterfeits set the card text in a near match, not the exact typeface: look at the card number in the
                  bottom corner, the power value and the effect text. Letter spacing that is a touch too wide, a bolder or thinner weight, or a comma or hyphen in
                  the wrong style all mark a fake. Spelling errors in the effect text are a giveaway, but the better fakes do not make them.
                </li>
                <li>
                  <strong>The colour and the print.</strong> Under a magnifier a real card shows a fine, regular dot pattern and clean black text; a fake shows blurred
                  edges on the text, colour that bleeds, or a coarser dot pattern. By eye, fakes are usually washed out or oversaturated compared to a real copy of
                  the same card.
                </li>
                <li>
                  <strong>The cut.</strong> Real cards have rounded corners with a consistent radius and smooth, clean edges. Fakes often have a slightly different
                  corner radius, a white line along one edge, or a rough cut you can feel.
                </li>
                <li>
                  <strong>The price.</strong> A Manga rare at a fifth of the lowest store price, a seller with twenty copies of a card that exists in the hundreds, a
                  &ldquo;graded&rdquo; card in a slab from a company you have not heard of: each of these is the counterfeit market&apos;s business model. The table
                  below is what the real cards cost at real stores today.
                </li>
              </ol>
              <Callout title="One real card is the best tool">
                Every check is a comparison. Keep one real common and one real foil from a recent set in your wallet or your binder&apos;s front page and you can check
                a card at a store, a tournament or a meetup in a minute.
              </Callout>
            </>
          ),
        },
        {
          id: "worth-checking",
          title: "The cards most worth checking today",
          body: (
            <>
              <p>
                The ten most expensive cards you can pull from a pack, by TCGplayer market price, with the cheapest in-stock price at the stores we compare in your
                market. These are the cards that get faked. If someone offers one well under the cheapest store here, assume it is a fake until the checks above say
                otherwise.
              </p>
              <CardTable cards={top} setById={cat.setById} country={country} />
              {first ? (
                <p>
                  {first.name}
                  {first.variant ? ` (${first.variant})` : ""} from {set(first.setId)?.name} tops the list at {money(first.marketUsd, "US")}. The full ranking is in{" "}
                  <Link href="/blog/most-expensive-one-piece-cards">the most expensive One Piece cards</Link>, rebuilt from our price data every time the page loads.
                </p>
              ) : null}
            </>
          ),
        },
        {
          id: "where",
          title: "Where fakes come from, and where they don't",
          body: (
            <>
              <SimpleTable
                head={["Where you buy", "Risk", "Why"]}
                rows={[
                  ["A card store opening its own product", "Very low", "The store pulled the card from a sealed pack. The only risk is a store that also buys collections without checking."],
                  ["TCGplayer and the stores we compare", "Low", "Sellers are accountable, refunds are easy, and the price data below makes a too-cheap listing stand out."],
                  ["eBay", "Low to medium", "Buyer protection covers counterfeits, but check seller feedback, photos of the actual card and the price against the table above."],
                  ["Social media, marketplace apps, cash sales", "High", "No protection, stock photos, and most of the reported fakes. Do every check in person before paying."],
                  ["Bulk lots and 'mystery' bundles", "High", "The cheapest way to move fakes is to hide a few among real commons."],
                ]}
              />
              <p>
                {stores ? `OP Compare tracks ${stores.toLocaleString("en-US")} stores ` : "OP Compare tracks real stores "}
                and shows only their own listings, so a price on a card page is a real store&apos;s price for a card it is accountable for. The{" "}
                <Link href="/stores">stores page</Link> lists them by market.
              </p>
            </>
          ),
        },
        {
          id: "graded",
          title: "Graded cards and fake slabs",
          body: (
            <>
              <p>
                A card in a PSA, BGS, CGC or SGC slab has already been checked for authenticity, which is one reason expensive One Piece cards trade graded. But the
                slabs are faked too, usually around a fake card. Check the certification number on the grader&apos;s own site: it should show the same card, the same
                grade and, where the grader publishes one, a matching photo. A slab with a scratched-off label, a number that returns a different card, or a grading
                company you cannot find is the fake you were trying to avoid.
              </p>
              <p>
                OP Compare&apos;s comparison covers raw cards; graded listings appear only in the eBay panel on a card&apos;s page, labelled as such, and are never
                counted as a store.
              </p>
            </>
          ),
        },
        {
          id: "bought-one",
          title: "If you have already bought one",
          body: (
            <ul>
              <li>
                <strong>Photograph the checks</strong>: the back beside a real card, the light test, the font. That is the evidence a refund claim needs.
              </li>
              <li>
                <strong>Claim within the window.</strong> eBay and PayPal treat a counterfeit as &ldquo;significantly not as described&rdquo;; marketplace apps and
                stores have their own windows, usually 14 to 30 days.
              </li>
              <li>
                <strong>Do not resell it</strong>, even marked as a proxy. Proxies get resold without the mark.
              </li>
              <li>
                <strong>Next time, buy from a store</strong> and compare the price first. Every card page on OP Compare ranks every in-stock listing by price, so a
                chase card at a real price is one click, and the <Link href="/tools/deal-finder">deal finder</Link> shows which stores are under market right now.
              </li>
            </ul>
          ),
        },
      ],
    };
  },
};
