import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";
import { getSiteStats } from "@/lib/data";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";
import { pageOg } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "About OP Compare",
  description: "Who runs OP Compare, what it does and how it is paid for.",
  alternates: { canonical: "/about" },
  openGraph: pageOg("/about"),
};

export default async function About() {
  const ebayLive = (await getSiteStats().catch(() => null))?.ebayLive ?? false;
  return (
    <StaticPage title={`About ${SITE_NAME}`} crumb="About">
      <p>
        {SITE_NAME} is a price comparison site for the One Piece Card Game. It
        answers one question for every card and sealed product: where is it
        cheapest to buy right now, in my country and my currency?
      </p>
      <p>
        It reads the public listings of dozens of stores in the United States,
        Australia, the United Kingdom, Singapore, Canada and the eurozone twice
        a day, matches every listing to the exact printing it is — standard,
        Parallel, Manga, SP, Treasure Rare or promo — and ranks the offers
        cheapest first. TCGplayer&apos;s catalogue is the backbone: every
        printing TCGplayer lists has a page here.
      </p>
      <h2>Who runs it</h2>
      <p>
        {SITE_NAME} is run by two people, Bill and George, who started it
        together and own it outright. No publisher, store or distributor owns a
        share or pays for a place in the tables. We use AI tools to help write
        code and draft guides; the prices themselves are read by a program from
        the stores&apos; own listings, never typed in or estimated.
      </p>
      <p>
        We also run price sites for other card games; they are listed once, on{" "}
        <Link href="/our-sites">our sites</Link>.
      </p>
      <h2>What it costs to run</h2>
      <p>
        Hosting, the database, the price imports and the tools we build with
        cost us about A$790 a month across all our sites (our own books, the 30
        days to 15 November 2026). The affiliate commission below is what pays
        for it.
      </p>
      <h2>How it is paid for</h2>
      <p>
        Some outbound links are affiliate links: when you buy through an eBay or
        TCGplayer link, {SITE_NAME} may earn a commission at no extra cost to
        you. Rows that are paid links are labelled. Affiliate status changes the
        order of a price comparison in one labelled way: eBay and TCGplayer are
        shown first, marked as paid links, whatever their price
        (on the pre-order pages, in their own &ldquo;Marketplaces&rdquo; block).
        The stores below them are always ranked cheapest first.
        {ebayLive ? (
          <>
            {" "}eBay prices are the cheapest matching Buy It Now listing we found,
            shown as an asking price among the stores — never moved up or down
            because they are eBay, except in that pre-order block. {SITE_NAME} is
            an eBay Partner Network affiliate.
          </>
        ) : null}
        {" "}Sealed product pages also link to Amazon (Amazon US in the US, Amazon
        Australia in Australia) with a &ldquo;Check price&rdquo; search: we don&apos;t
        read Amazon&apos;s prices, so it is never ranked with the stores. As an
        Amazon Associate I earn from qualifying purchases.
      </p>
      <h2>Not affiliated with Bandai</h2>
      <p>
        {SITE_NAME} is an independent, fan-made site. It is not affiliated with,
        endorsed or sponsored by Bandai, Eiichiro Oda, Shueisha or Toei
        Animation. ONE PIECE and the One Piece Card Game are trademarks of their
        respective owners; card images are TCGplayer&apos;s product images.
      </p>
      <p>
        Questions, corrections or a store to add:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </StaticPage>
  );
}
