import Link from "next/link";
import { CardSearch } from "@/components/CardSearch";
import { CardTile } from "@/components/CardTile";
import { MarketPills } from "@/components/CountrySelect";
import { DealList } from "@/components/DealList";
import { Icon } from "@/components/Icon";
import { HatMark, Wordmark } from "@/components/Logo";
import { SealedTile } from "@/components/SealedTile";
import { Delta, Faq, JsonLd, SectionHeader } from "@/components/ui";
import { COLORS, COLOR_KEYS } from "@/lib/constants";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getSealedCatalog, getSiteStats } from "@/lib/data";
import { ago, int, longDate } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { biggestSavings, boosterBoxes, mostValuable, movers, newestBoosterSet, upcomingSets } from "@/lib/selectors";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { storesIn } from "@/lib/stores";

export default async function HomePage() {
  const country = getCountry();
  const c = COUNTRIES[country];
  const [cat, sealed, stats] = await Promise.all([getCatalog(), getSealedCatalog(), getSiteStats()]);
  const newest = newestBoosterSet(cat.sets);
  const chase = newest ? mostValuable(cat.cards, 6, (x) => x.setId === newest.id) : [];
  // The single best deal is the homepage teaser; Deal Finder holds the rest
  // (top 3 with a free account, every one with Plus).
  const savings = biggestSavings(cat.cards, country, 1);
  const drops = movers(cat.cards, "down", 5);
  const rising = movers(cat.cards, "up", 5);
  // Trending: this week's biggest risers once there is a week of history; until
  // then the most valuable standard prints of the newest set (not the chase row).
  const trending = rising.length >= 6 ? movers(cat.cards, "up", 6) : newest ? mostValuable(cat.cards, 6, (x) => x.setId === newest.id && x.printing === "standard") : [];
  const boxes = boosterBoxes(sealed, cat.setById).slice(0, 6);
  const next = upcomingSets(cat.sets)[0];
  const storeCount = storesIn(country).length + (country === "US" ? 1 : 0);
  const priced = cat.cards.filter((x) => x.low[country] != null).length;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/browse?q={query}`, "query-input": "required name=query" },
        }}
      />
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-ink-800" style={{ backgroundImage: "var(--hero-sea)" }}>
        <div className="sea-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="container-app relative flex flex-col items-center py-12 text-center sm:py-16">
          <Link href="/" className="mb-5 flex items-center gap-2" aria-label={SITE_NAME}>
            <HatMark size={40} className="animate-bob" />
            <Wordmark className="text-xl" />
          </Link>
          <h1 className="font-brand text-[42px] font-normal uppercase leading-[1.05] text-white sm:text-[68px]">
            <span className="bg-gradient-to-b from-[#ff5a60] to-[#d92b33] bg-clip-text text-transparent">One Piece</span> Card Prices
          </h1>
          <p className="mt-4 text-lg font-semibold text-white sm:text-xl">Buy One Piece cards at the best price</p>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-slate-300 sm:text-base">
            Price check any card and find the cheapest place to buy — live One Piece Card Game prices from every {c.adjective} store we track, plus five
            more markets in their own currency: the US, Australia, the UK, Singapore, Canada and Europe, updated twice a day.
          </p>
          <div className="mt-7 w-full max-w-2xl">
            <CardSearch size="lg" placeholder="Search any One Piece card…" />
          </div>
          {trending.length ? (
            <div className="mt-5 w-full max-w-2xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Trending</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {trending.map((t) => (
                  <Link key={t.id} href={`/card/${t.slug}`} className="truncate rounded-md border border-ink-700 bg-ink-900/80 px-3 py-3 text-sm font-medium text-slate-100 hover:border-ink-600 hover:bg-ink-850">
                    {t.name}
                    {t.variant ? <span className="text-slate-400"> · {t.variant.split(" · ")[0]}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <p className="num mt-5 text-sm text-slate-400">
            {int(cat.cards.length)} cards · {storeCount} {c.adjective} {storeCount === 1 ? "store" : "stores"} ·{" "}
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              prices updated {ago(stats.lastImportAt)}
            </span>
          </p>
          <Link href="/browse" className="mt-4 text-[15px] font-semibold text-white hover:text-brand-400">
            All {int(cat.cards.length)} cards in the database →
          </Link>
          <div className="mt-6">
            <MarketPills />
          </div>
        </div>
      </section>

      <div className="container-app space-y-14 py-10">
        {/* ── Deals ── */}
        <section>
          <SectionHeader
            title="Today's Top Deals"
            sub={`The best live opportunities in ${c.place} right now — refreshed twice a day.`}
            action={
              <Link href="/tools/deal-finder" className="btn-ghost">
                Browse all deals →
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DealList
              title="Biggest saving"
              sub="Today's top deal. A free account shows the top 3; Plus shows every one."
              rows={savings.map(({ card, saving }) => ({
                card,
                badge: <span className="num rounded bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400">Save {saving.toFixed(0)}%</span>,
              }))}
              country={country}
              setById={cat.setById}
              empty={`No ${c.adjective} listing is far enough under TCGplayer's market price today.`}
            />
            <DealList
              title="Price drops"
              sub="Biggest 7-day falls in market price"
              rows={drops.map((card) => ({ card, badge: <Delta v={card.change7d} className="text-[11px]" />, note: "7-day drop" }))}
              country={country}
              setById={cat.setById}
              empty="Weekly moves appear once we have seven days of price history."
            />
            <DealList
              title="Rising cards"
              sub="Biggest 7-day climbs in market price"
              rows={rising.map((card) => ({ card, badge: <Delta v={card.change7d} className="text-[11px]" />, note: "7-day rise" }))}
              country={country}
              setById={cat.setById}
              empty="Weekly moves appear once we have seven days of price history."
            />
          </div>
        </section>

        {/* ── Newest set ── */}
        {newest ? (
          <section>
            <SectionHeader
              title={`${newest.name} — chase cards`}
              sub={`${newest.code} · released ${longDate(newest.releasedOn)}. The most valuable printings from the newest booster set, cheapest listing in ${c.place}.`}
              action={
                <Link href={`/sets/${newest.slug}`} className="btn-ghost">
                  Full {newest.code} card list →
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {chase.map((card) => (
                <CardTile key={card.id} card={card} setCode={newest.code} country={country} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Sealed ── */}
        {boxes.length ? (
          <section>
            <SectionHeader
              title="Booster boxes"
              sub="Every booster box we price, newest set first — with the per-pack cost where the pack count is certain."
              action={
                <Link href="/sealed" className="btn-ghost">
                  All sealed products →
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {boxes.map((s) => (
                <SealedTile key={s.id} s={s} country={country} setCode={cat.setById.get(s.setId!)?.code} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Colours ── */}
        <section>
          <SectionHeader title="Browse by colour" sub="Every One Piece card belongs to one or two of six colours. Each colour page lists its cards with live prices." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COLOR_KEYS.map((k) => {
              const n = cat.cards.filter((x) => x.colors.includes(k)).length;
              return (
                <Link key={k} href={`/colors/${COLORS[k].slug}`} className="card-surface group relative overflow-hidden p-4 hover:border-ink-600">
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: COLORS[k].hex }} />
                  <p className="font-display text-lg font-extrabold text-white group-hover:text-brand-400">{k}</p>
                  <p className="text-xs text-slate-400">{COLORS[k].tagline}</p>
                  <p className="num mt-2 text-xs text-slate-500">{int(n)} printings</p>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Building around a Leader? <Link href="/leaders" className="link">Every Leader card, priced</Link>.
          </p>
        </section>

        {/* ── How it works ── */}
        <section>
          <SectionHeader title="How OP Compare works" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: "search", t: "Search any card", d: "Every One Piece printing TCGplayer lists — base, Parallel, Manga, SP, Treasure Rare and promo — with its set and card number." },
              { icon: "store", t: "We read every store", d: `${int(priced)} cards have a live ${c.adjective} listing right now. Stores are read twice a day; TCGplayer's market price is shown as a reference.` },
              { icon: "tag", t: "Buy at the best price", d: "Offers are ranked cheapest first by item price, in your own currency. Click through and buy from the store directly." },
            ].map((s) => (
              <div key={s.t} className="card-surface p-5">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-500/15 text-brand-400">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-lg text-white">{s.t}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-300">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <SectionHeader title="Questions" />
          <Faq
            items={[
              {
                q: "Where do the prices come from?",
                a: (
                  <>
                    From the public product listings of the stores on <Link href="/stores" className="link">our stores page</Link>, read twice a day, and from
                    TCGplayer (the cheapest listing in the US, plus its market price as a reference everywhere).{" "}
                    {stats.ebayLive ? (
                      <>
                        Twice a day we also look up the cheapest matching eBay Buy It Now listing for cards worth US$20 or more and sealed worth US$30 or more,
                        shown as an asking price among the stores; the eBay button on a card searches your own eBay for more.
                      </>
                    ) : (
                      <>The eBay button on a card searches your own eBay for it.</>
                    )}
                  </>
                ),
              },
              {
                q: "Which printings does OP Compare price?",
                a: "Every English One Piece Card Game printing TCGplayer lists: the standard print, Parallels and alternate arts, Manga rares, SP cards, Treasure Rares, special foils, reprints, promos and DON!! cards. Each has its own page, because their prices differ by orders of magnitude.",
              },
              {
                q: "Why does a card show “≈” instead of a price?",
                a: `No store we track in ${c.place} has a listing for it right now, so we show TCGplayer's market price converted to ${c.currency} as a reference. It is not a price you can buy at.`,
              },
              next
                ? {
                    q: "When is the next One Piece set?",
                    a: `${next.name} (${next.code}) is listed for ${longDate(next.releasedOn)}. Its card list and pre-order prices fill in on its set page as TCGplayer adds them.`,
                  }
                : { q: "How often are prices updated?", a: "Twice a day, at 07:00 and 19:00 UTC." },
            ]}
          />
        </section>
      </div>
    </>
  );
}
