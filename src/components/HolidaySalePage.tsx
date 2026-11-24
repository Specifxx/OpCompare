import { InlineSignupPrompt } from "@/components/InlineSignupPrompt";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { COUNTRY_LIST } from "@/lib/country";
import { getSealedCatalog } from "@/lib/data";
import { money } from "@/lib/format";
import { pageOg } from "@/lib/og/meta";
import { blackFriday, seasonYear } from "@/lib/black-friday";
import { FamilyCluster } from "@/components/FamilyCluster";
import { SalePriceWatch } from "@/components/SalePriceWatch";
import { SaleDeals } from "@/components/SaleDeals";
import { SaleNav } from "@/components/SaleNav";
import { TELEGRAM_URL } from "@/components/DiscordCta";
import { saleDealRows } from "@/lib/sale-deals-data";
import { DISCORD_URL } from "@/lib/site";
import { TcgplayerSaleBlock } from "@/components/TcgplayerSaleBlock";
import { TcgplayerCyberBanner } from "@/components/TcgplayerCyberBanner";
import { affiliateUrl } from "@/lib/affiliate";
import { DEFAULT_COUNTRY } from "@/lib/country";

// The Black Friday and Cyber Monday pages, /black-friday (DECISIONS.md, "Black Friday page", 2026-11-02) and
// /cyber-monday (2026-11-06, "Black Friday and Cyber Monday price watch pages"): one URL each, kept every year,
// one component. Reads only the cached sealed catalogue, the price watch loader and nothing about the visitor,
// so every market is drawn on the page and the price watch is the US's, the market that earns. The route files
// set six hours, the floor for pages buyers act on.

export type SaleEvent = "black-friday" | "cyber-monday";
const NAMES: Record<SaleEvent, string> = { "black-friday": "Black Friday", "cyber-monday": "Cyber Monday" };

const today = () => new Date().toISOString().slice(0, 10);

export function holidayMetadata(event: SaleEvent): Metadata {
  const y = seasonYear(today());
  const name = NAMES[event];
  return {
    title: { absolute: `One Piece ${name} Deals ${y}: Booster Box Prices` },
    description:
      event === "black-friday"
        ? `One Piece booster boxes and sealed product under TCGplayer's market price today, and the cheapest booster boxes in six markets, checked daily through Black Friday and Cyber Monday ${y}. Plus a US price watch: sealed boxes, the week's biggest price drops and graded cards, each with a live eBay listing.`
        : `One Piece Cyber Monday ${y}: sealed product under TCGplayer's market price today, the cheapest booster boxes in six markets, and a US price watch of sealed boxes, the week's biggest price drops and graded cards, each linking to a live eBay listing.`,
    alternates: { canonical: `/${event}` },
    openGraph: pageOg(`/${event}`),
  };
}

export async function HolidaySalePage({ event }: { event: SaleEvent }) {
  const name = NAMES[event];
  const now = today();
  const y = seasonYear(now);
  const bf = blackFriday(y);
  const sealed = await getSealedCatalog();
  const boxes = sealed.filter((s) => s.kind === "Booster Box" && !s.presale);
  // ONE deal list (owner's review, 2026-11-24): the US's "furthest under their own 30-day price" and "under TCGplayer's market
  // price" merged, one price per row (lib/sale-deals*.ts, components/SaleDeals.tsx).
  const rows = await saleDealRows(sealed, DEFAULT_COUNTRY, event, event).catch(() => []);
  const best = Math.max(0, ...rows.map((r) => Math.max(r.typical?.pct ?? 0, r.tcg?.pct ?? 0)));
  return (
    <div className="flex max-w-4xl flex-col gap-6 py-6">
      <Breadcrumbs trail={[{ name: `${name} deals` }]} />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black">One Piece {name} deals {y}</h1>
        <p className="text-slate-300">
          {rows.length ? `${rows.length} US deals today, up to ${best}% off` : "Sealed product under its usual price"}, checked every day through the sales.
          {now < bf ? " Many stores start their sales earlier." : ""}{" "}
          <a href="#how-we-calculate" className="text-brand-400 hover:underline">How we calculate</a>
        </p>
        <p className="text-xs text-slate-400">Store buttons and eBay links are paid links: we may earn a commission, at no cost to you.</p>
      </header>

      <SaleNav
        page={event}
        items={[
          { id: "deals", label: "Deals" },
          { id: "boxes-by-market", label: "Cheapest boxes by market" },
          { id: "price-watch", label: "Price watch" },
          { id: "tcgplayer-sale", label: "TCGplayer sale" },
          { id: "how-we-calculate", label: "How we calculate" },
        ]}
      />

      <section id="deals" aria-labelledby="deals-h" className="scroll-mt-header">
        <h2 id="deals-h" className="sr-only">{name} deals</h2>
        {rows.length ? (
          <SaleDeals rows={rows} market={DEFAULT_COUNTRY} page={event} discordHref={DISCORD_URL || null} telegramHref={TELEGRAM_URL} />
        ) : (
          <p className="text-sm text-slate-400">Nothing sealed is under its own 30-day price or TCGplayer&apos;s market price in the US today. This fills in as stores cut prices.</p>
        )}
      </section>

      <section id="boxes-by-market" className="flex scroll-mt-header flex-col gap-3">
        <h2 className="text-xl font-bold">Cheapest booster boxes in each market today</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {COUNTRY_LIST.map((c) => {
            const rows = boxes.filter((s) => s.low[c.code] != null && s.stores[c.code] > 0).sort((a, b) => a.low[c.code]! - b.low[c.code]!).slice(0, 5);
            return (
              <div key={c.code} className="rounded-xl border border-ink-800 p-3">
                <h3 className="mb-1 font-semibold">{c.label}</h3>
                {!rows.length && <p className="text-sm text-slate-400">No booster box in stock at a store we track.</p>}
                <ol className="text-sm">
                  {rows.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 border-t border-ink-800 py-1">
                      <Link className="truncate hover:underline" href={`/sealed/${s.slug}`}>{s.name}</Link>
                      <span className="shrink-0 tabular-nums">{money(s.low[c.code], c.code)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">Each market in its own currency, from the stores that charge in it.</p>
      </section>

      {/* The price watch (2026-11-06): the US, the market that earns; every row ends in a live eBay listing. */}
      <SalePriceWatch market={DEFAULT_COUNTRY} page={event} source={event} />

      {/* Cyber Weekend capture (owned audience, 2026-11-21): a free account (Deal Finder's top three savings). */}
      <InlineSignupPrompt
        surface="black_friday"
        title="Find this weekend's cheapest listings, free"
        body="A free account shows Deal Finder's three biggest savings in your market right now: real store listings under TCGplayer's market price."
      />

      <div id="tcgplayer-sale" className="flex scroll-mt-header flex-col gap-3">
      <TcgplayerCyberBanner
        href={affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&ProductTypeName=Sealed+Products", "tcgplayer", `/${event}`)}
        at={Date.now()}
        page={event}
      />
      <TcgplayerSaleBlock name={event === "black-friday" ? "Black Friday" : "Cyber Monday"} page={event} />
      </div>

      <section id="how-we-calculate" className="flex scroll-mt-header flex-col gap-2 rounded-xl border border-ink-800 p-4 text-sm text-slate-300">
        <h2 className="text-lg font-bold text-white">How we calculate</h2>
        <p>
          Each deal row is the cheapest store or TCGplayer listing a shopper can order now in the US (never eBay), and both savings are measured against that one
          price. &ldquo;Biggest price drops&rdquo; compares it with the product&apos;s own 30-day typical price: the median of its cheapest listing on each of the
          last 30 days we recorded (two weeks of records at least; a day far under the rest is left out as a wrong listing). &ldquo;Under TCGplayer&rdquo; compares
          it with TCGplayer&apos;s market price, 5% to 60% under, for products worth $10 or more, in US dollars on both sides.
        </p>
        <p>We only see what a listing asks when we read it, so a sale can start or end between reads; a row read more than 12 hours ago says so. Item prices before shipping. Check the price at checkout.</p>
      </section>

      <p className="text-sm">
        <Link className="text-brand-400 hover:underline" href={event === "black-friday" ? "/cyber-monday" : "/black-friday"}>{event === "black-friday" ? "Cyber Monday deals" : "Black Friday deals"} →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/graded">Graded prices →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/sealed">Every sealed product →</Link> · <Link className="text-brand-400 hover:underline" href="/tools/deal-finder">Deal Finder →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/market">Market index →</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/blog/one-piece-card-game-gift-guide">Gift guide and Black Friday tips →</Link>
      </p>
      <p className="text-sm text-slate-400">
        Later in the season: <Link className="text-brand-400 hover:underline" href="/boxing-day">Boxing Day deals</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/january-sales">January sales</Link> ·{" "}
        <Link className="text-brand-400 hover:underline" href="/lunar-new-year">Lunar New Year deals</Link>
      </p>
      <FamilyCluster kind="deal" />
    </div>
  );
}
