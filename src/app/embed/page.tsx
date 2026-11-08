import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { getCatalog } from "@/lib/data";
import { MARKETS } from "@/lib/country";
import { pageOg } from "@/lib/og/meta";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { dailySnippet, embedSnippet, storeBadge } from "@/lib/embed";
import { attributionHtml, PRICE_API_PATH } from "@/lib/price-api";

// The free widgets directory (DECISIONS.md, "Free price widgets", 2026-11-02): what outreach points at instead of
// asking for a link. Code only, never live iframes of our own widgets.
export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Free One Piece Card Price Widgets",
  description: "A live One Piece card price badge for deck guides, blogs and community sites, and a badge for the stores we compare. One line of HTML, free, no signup.",
  alternates: { canonical: "/embed" },
  openGraph: pageOg("/embed"),
};

export default async function EmbedPage() {
  const cat = await getCatalog();
  // A real card US stores stock, the most valuable one, so an unedited snippet shows a working badge.
  const example = [...cat.cards].filter((c) => c.low.US != null && c.stores.US > 0 && c.marketUsd != null).sort((a, b) => b.marketUsd! - a.marketUsd!)[0];
  const slug = example?.slug ?? "CARD-SLUG";
  const snippet = embedSnippet(SITE_URL, SITE_NAME, slug, example?.name ?? "CARD NAME", "One Piece card price");
  const badge = storeBadge(SITE_URL, SITE_NAME, "One Piece");
  const daily = dailySnippet(SITE_URL, SITE_NAME, "One Piece");
  return (
    <div className="flex max-w-3xl flex-col gap-8 py-6">
      <Breadcrumbs trail={[{ name: "Free widgets" }]} />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black">Free One Piece card price widgets</h1>
        <p className="text-slate-300">
          Put a live card price on any page with one line of HTML. It shows the cheapest listing we track in your readers&apos; market and updates itself.
          Free, no signup, no tracking. The widget is noindex, so it never competes with your own pages in search.
        </p>
      </header>
      <section className="flex flex-col gap-3 rounded-xl border border-ink-800 p-4">
        <h2 className="text-lg font-bold">Card price badge</h2>
        <p className="text-sm text-slate-400">
          For deck guides, tier lists and set reviews: one under each card you mention. <Link className="text-brand-400 hover:underline" href={`/embed/card/${slug}`}>See it running →</Link>
        </p>
        <pre className="overflow-x-auto rounded bg-ink-950 p-3 text-xs"><code>{snippet}</code></pre>
        <ul className="list-disc pl-5 text-sm text-slate-400">
          <li>Change <code>{slug}</code> (in both places) to the last part of any card&apos;s address on {SITE_NAME}, after <code>/card/</code>.</li>
          <li>Add <code>?market=UK</code> to the widget address for another market: {MARKETS.join(", ")}. The US is the default.</li>
          <li>The plain link under the widget is optional; it is the part that tells search engines where the price comes from.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-ink-800 p-4">
        <h2 className="text-lg font-bold">Daily price game</h2>
        <p className="text-sm text-slate-400">
          For creators, crews and club sites: today&apos;s One Piece Price Duel, two cards and &ldquo;which is worth more?&rdquo;. It changes by itself every day at midnight UTC. <Link className="text-brand-400 hover:underline" href="/embed/daily">See it running →</Link>
        </p>
        <pre className="overflow-x-auto rounded bg-ink-950 p-3 text-xs"><code>{daily}</code></pre>
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-ink-800 p-4">
        <h2 className="text-lg font-bold">For stores we compare</h2>
        <p className="text-sm text-slate-400">
          A plain-HTML badge telling customers your prices are compared openly. No script, no image. <Link className="text-brand-400 hover:underline" href="/stores">Stores we track →</Link>
        </p>
        <div dangerouslySetInnerHTML={{ __html: badge }} />
        <pre className="overflow-x-auto rounded bg-ink-950 p-3 text-xs"><code>{badge}</code></pre>
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-ink-800 p-4" id="price-data">
        <h2 className="text-lg font-bold">Free price data</h2>
        <p className="text-sm text-slate-400">
          Building a Discord bot, a deck or collection tool, a spreadsheet or a blog? Every priced One Piece card and sealed product, with its cheapest
          in-stock store price in each market, is in one JSON file: <a className="text-brand-400 hover:underline" href={PRICE_API_PATH}>{SITE_URL}{PRICE_API_PATH}</a>.
          Free, no key, no signup, open to every origin, refreshed every few hours.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-400">
          <li>Each product has an <code>id</code>, a <code>name</code> (and a card&apos;s <code>number</code> and <code>printing</code>) and, per market, <code>cents</code> in that market&apos;s <code>currency</code> with a <code>url</code> to its comparison.</li>
          <li>Store prices only: never eBay, and never converted between currencies.</li>
          <li>Free for any use, including commercial. The one condition: a visible link back wherever the prices appear, for example:</li>
        </ul>
        <pre className="overflow-x-auto rounded bg-ink-950 p-3 text-xs"><code>{attributionHtml()}</code></pre>
      </section>
    </div>
  );
}
