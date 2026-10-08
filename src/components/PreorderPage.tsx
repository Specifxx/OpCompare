import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { HubFaq } from "@/components/HubFaq";
import { PreorderProduct } from "@/components/PreorderProduct";
import { ReleaseAlertSlot } from "@/components/ReleaseAlertSlot";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getEbayPanel, getSealedCatalog, getSealedDetail, type SealedLite } from "@/lib/data";
import { getCountry } from "@/lib/get-country";
import { faqPage, ldJson, webPage } from "@/lib/jsonld";
import { pageOg } from "@/lib/og/meta";
import { daysUntil, groupForSet, longDateOf, PREORDER_PAGES, preorderGroups, productBoard, shortDateOf, type PreorderGroup, type ProductBoard } from "@/lib/preorders";
import { ebaySearchUrl, onePieceEbayQuery, outboundRel } from "@/lib/affiliate";
import { SITE_URL } from "@/lib/site";

// ─────────────────────────────────────────────────────────────────────────────
// One pre-order page per release (/op18-preorders, /eb05-preorders): the same
// box, at every store, before it ships.
// ─────────────────────────────────────────────────────────────────────────────
// RiftCompare's /radiance-preorders for One Piece. Before a set is out the
// product is identical at every seller (nobody has opened one), so price is the
// only variable, and the spread between stores is both large and unshopped. Each
// product lists the visitor's market's pre-order prices from the stores we
// track, TCGplayer's cheapest listing and eBay's, ranked together by ITEM price
// (an eBay or TCGplayer row is never moved for being a partner link), with an
// eBay search and TCGplayer link always offered beside them.
//
// EVERY PRICE HERE IS A PRE-ORDER and the page says so in the heading, on each row
// and in its structured data (schema.org PreOrder, never InStock).
//
// DATE-DRIVEN and self-retiring: it reads the catalogue's own release date and
// presale flags, so on release day it switches to a "released" state pointing at
// live prices, and the "also coming" section lists whatever else is not out yet.
// A route is a PreorderConfig and two exports (see app/eb05-preorders); the
// route file keeps `export const revalidate = 3600` itself (Next reads it statically).

export interface PreorderConfig {
  /** Catalogue set code, e.g. "OP18". */
  code: string;
  /** Route, e.g. "/op18-preorders" (also the canonical URL). */
  path: string;
  /** Short label used in copy, e.g. "OP18". */
  label: string;
  /** Fallback set name until the catalogue has one. */
  fallbackName: string;
  /** What kind of release it is, for the FAQ ("the next main booster set"). */
  kindLine: string;
  /** Sealed kinds that get a "what is it" explainer (keys of EXPLAINERS). */
  explain: ("box" | "case" | "pack" | "double")[];
  title: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  /** Catalogue code of the set's release-event promo cards, if it has one. */
  eventCode?: string;
}

const EXPLAINERS = {
  box: (packs: number | null) => ({ n: "Booster box", d: `A sealed box of booster packs${packs ? ` (${packs} packs)` : ""}. The usual way to open a set.` }),
  case: () => ({ n: "Booster case", d: "A sealed carton of several booster boxes. Priced as a case, so compare it with other cases, not with a single box." }),
  pack: () => ({ n: "Booster pack", d: "One pack of cards. Pre-order pack prices are listed where a store or marketplace has them." }),
  double: () => ({ n: "Double Pack Set", d: "A two-pack set released alongside the booster. Listed here when it is a pre-order, with its display." }),
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function preorderMetadata(cfg: PreorderConfig): Promise<Metadata> {
  const cat = await getCatalog().catch(() => null);
  const set = cat?.sets.find((s) => s.code === cfg.code);
  const when = set?.releasedOn ? ` Out ${longDateOf(set.releasedOn)}.` : "";
  const name = set?.name ?? cfg.fallbackName;
  return {
    title: { absolute: cfg.title },
    description: `One Piece ${cfg.label} ${name} booster box, case and pack pre-order prices from every tracked store, TCGplayer and eBay, in your currency, refreshed daily.${when}`,
    keywords: cfg.keywords,
    alternates: { canonical: cfg.path },
    openGraph: pageOg(cfg.path, { title: cfg.ogTitle, description: cfg.ogDescription }),
  };
}

async function boardsFor(products: SealedLite[], country: ReturnType<typeof getCountry>, page: string): Promise<{ s: SealedLite; board: ProductBoard }[]> {
  return Promise.all(
    products.map(async (s) => {
      const [detail, panel] = await Promise.all([getSealedDetail(s.slug).catch(() => null), getEbayPanel(s.id).catch(() => ({ listings: [], graded: [] }))]);
      return { s, board: productBoard(detail?.offers ?? [], panel.listings, country, `/${page}`) };
    }),
  );
}

export async function PreorderPage({ cfg }: { cfg: PreorderConfig }) {
  const { code: SET_CODE, path: PATH, label: L } = cfg;
  const PAGE = PATH.slice(1);
  const country = getCountry();
  const info = COUNTRIES[country];
  const today = todayIso();
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const set = cat.sets.find((s) => s.code === SET_CODE) ?? null;
  const groups = preorderGroups(sealed, cat.sets, today);
  const main = groupForSet(groups, SET_CODE);
  const others = groups.filter((g) => g !== main);
  const stillUpcoming = Boolean(main) || Boolean(set?.releasedOn && set.releasedOn > today);
  const released = Boolean(set?.releasedOn && set.releasedOn <= today && !main);
  const releaseIso = main?.releasedOn ?? set?.releasedOn ?? null;
  const days = releaseIso ? daysUntil(releaseIso, today) : null;
  const setName = set?.name ?? cfg.fallbackName;
  const eventSet = cfg.eventCode ? cat.sets.find((s) => s.code === cfg.eventCode) : undefined;

  const [mainBoards, otherBoards] = await Promise.all([main ? boardsFor(main.products, country, PAGE) : Promise.resolve([]), Promise.all(others.map((g) => boardsFor(g.products, country, PAGE)))]);
  const boxPacks = mainBoards.find((x) => x.s.kind === "Booster Box")?.s.packCount ?? null;
  const priced = mainBoards.filter((b) => b.board.rows.length);

  const faqs = [
    {
      q: `How much does a ${L} booster box cost to pre-order?`,
      a: "Pre-order prices vary between sellers because nothing has shipped and each one sets its own opening price. This page lists every tracked store's pre-order price in your market beside TCGplayer's cheapest listing and eBay's, cheapest first by item price, so you see the real spread rather than the first price you find.",
    },
    {
      q: `When does One Piece ${L} release?`,
      a: releaseIso
        ? `${longDateOf(releaseIso)}. ${L} is "${setName}", ${cfg.kindLine}.${eventSet?.releasedOn ? ` TCGplayer lists its release-event promo cards separately as ${eventSet.code}, dated ${longDateOf(eventSet.releasedOn)}.` : ""}`
        : `${L} is "${setName}", ${cfg.kindLine}. This page fills in the date as soon as it is in the catalogue.`,
    },
    {
      q: "Is it cheaper to pre-order or to wait until release?",
      a: "It depends on the product. Sealed boxes often sit at or near the list price during pre-order and can rise at launch if demand outruns allocation, while singles are usually cheapest a few weeks after release once supply settles. If you want to open product, pre-ordering at a good price is reasonable; if you want specific cards, waiting and buying singles is usually cheaper.",
    },
    {
      q: "Are these pre-order prices final?",
      a: "No. A pre-order price is what the seller is asking today, and sellers change them before release, up or down, as allocation firms up. We refresh these daily; nothing here is a commitment from the seller or from us. Always confirm the price and the seller's pre-order terms at checkout.",
    },
    {
      q: "Do the prices include postage?",
      a: "They are item prices, ranked as listed. Each store's postage is measured from its own checkout and shown on the row where it is known; a sealed box usually ships as a parcel, so check the checkout for it. eBay rows show the postage the seller states.",
    },
    {
      q: "Why show TCGplayer and eBay beside stores?",
      a: "Before release, TCGplayer and eBay prices are individual sellers' asking prices for stock they expect to receive, not a store's list price. They are ranked with the stores by item price and never moved up or down for being a partner link, so a store pre-order is shown first whenever it is the cheaper route, and a marketplace listing is shown first when it is.",
    },
    {
      q: "What is the difference between a booster box and a case?",
      a: `A booster box is a sealed box of booster packs${boxPacks ? ` (${L}'s box holds ${boxPacks} packs)` : ""}. A case is a sealed carton of several boxes, which is why its price is many times a single box's. Compare like with like: this page lists each separately.`,
    },
    {
      q: "How do you earn money from this page?",
      a: "Links to TCGplayer and eBay are affiliate links, so OP Compare earns a commission on qualifying purchases at no extra cost to you. Store rows are not paid placements and no seller can buy a better position: every row is ranked by its item price.",
    },
  ];

  const ld = ldJson(
    webPage({ name: `One Piece ${L} Pre-Order Prices`, href: PATH, description: `Pre-order price comparison for One Piece ${L} sealed products across every tracked store, TCGplayer and eBay, updated daily.`, type: "CollectionPage" }),
    priced.length
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `One Piece ${L} pre-orders`,
          url: `${SITE_URL}${PATH}`,
          itemListElement: priced.slice(0, 20).map(({ s, board }, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: s.name,
              ...(s.imageUrl ? { image: s.imageUrl } : {}),
              offers: {
                "@type": "AggregateOffer",
                // Never InStock: none of this has shipped.
                availability: "https://schema.org/PreOrder",
                priceCurrency: info.currency,
                lowPrice: ((board.rows[0]?.priceCents ?? 0) / 100).toFixed(2),
                offerCount: board.rows.length,
              },
            },
          })),
        }
      : null,
    faqPage(faqs),
  );

  const boxQuery = onePieceEbayQuery(`${setName} booster box English`).replace(/\bbooster box\b/i, "booster (box,display)");

  return (
    <div className="mx-auto max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <Breadcrumbs trail={[{ href: "/sealed", name: "Sealed" }, { name: `${L} pre-orders` }]} />

      <span className="chip mb-3 inline-flex bg-gold/15 text-[11px] font-bold uppercase tracking-wide text-gold [font-feature-settings:'lnum'_1]">
        {released ? "Now out" : `Pre-order${releaseIso ? ` · releases ${longDateOf(releaseIso)}` : ""}${days != null && days > 0 ? ` · ${days} ${days === 1 ? "day" : "days"} to go` : ""}`}
      </span>
      <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">One Piece {L} pre-order prices</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        {released
          ? `${setName} is out, so its products are priced alongside every other set. Live prices are on the sealed page.`
          : `${L} is "${setName}", ${cfg.kindLine}. Nothing has shipped yet, so every seller is simply picking an opening price, and they are picking very different ones. Below, each product lists the pre-order prices from our tracked ${info.adjective} stores beside TCGplayer's cheapest listing and eBay's, cheapest first, in ${info.currency}. Prices refresh daily.`}
      </p>

      {stillUpcoming && !released ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#0064d2]/30 bg-[#0064d2]/[0.06] px-4 py-3">
          <span className="min-w-0 flex-1 text-sm text-slate-300">
            <span className="font-semibold text-white">Prefer a marketplace?</span> Search eBay for {L} booster boxes and displays. Not part of the store ranking below.
          </span>
          <a href={ebaySearchUrl(country, boxQuery, "preorders-strip")} target="_blank" rel={outboundRel()} data-retailer="ebay_search" data-page={PAGE} data-surface="preorder_strip" className="btn-ebay">
            Search eBay →
          </a>
        </div>
      ) : null}

      {mainBoards.length ? (
        <div className="mt-5 space-y-4">
          <h2 className="sr-only">{L} pre-order prices by product</h2>
          {mainBoards.map(({ s, board }) => (
            <PreorderProduct key={s.id} s={s} board={board} country={country} page={PAGE} />
          ))}
        </div>
      ) : (
        <div className="card-surface mt-5 p-6">
          <h2 className="font-bold text-white">{released ? `${L} is out: see live prices` : `No ${L} pre-orders tracked yet`}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {released ? (
              <>
                {L} has released, so its products are priced alongside every other set: <Link href="/sealed" className="text-brand-300 underline-offset-2 hover:underline">see live sealed prices</Link>
                {set ? (
                  <>
                    {" "}or <Link href={`/sets/${set.slug}`} className="text-brand-300 underline-offset-2 hover:underline">browse every {L} card</Link>
                  </>
                ) : null}
                .
              </>
            ) : (
              "We list pre-orders as the stores we track publish them, and none have appeared yet. This page fills in on its own as they do: nothing here is ever an estimate or a placeholder price."
            )}
          </p>
        </div>
      )}

      {set && stillUpcoming ? <ReleaseAlertSlot setSlug={set.slug} setName={set.name} releasedOn={set.releasedOn} source="sealed" unreleasedOnly className="mt-6 max-w-lg" /> : null}

      {stillUpcoming && !released ? (
        <section className="card-surface mt-8 p-6">
          <h2 className="text-xl font-extrabold text-white">What each {L} product is</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {cfg.explain.map((k) => EXPLAINERS[k](boxPacks)).map((p) => (
              <div key={p.n} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <dt className="font-bold text-white">{p.n}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-400">{p.d}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {stillUpcoming && !released ? (
        <section className="card-surface mt-6 p-6">
          <h2 className="text-xl font-extrabold text-white">When to pre-order {L}, and when to wait</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-400 [font-feature-settings:'lnum'_1]">
            <li>
              <strong className="text-slate-200">Want to open product?</strong> Pre-ordering is reasonable, because allocation, not price, is what runs out. The spread between the cheapest and dearest seller above is the whole argument for comparing first: it is the same box either way, since nobody has opened one.
            </li>
            <li>
              <strong className="text-slate-200">Want specific cards?</strong> Waiting is usually cheaper. Singles are most volatile in the first days after release and typically settle a few weeks later once supply catches up. {set ? <Link href={`/sets/${set.slug}`} className="text-brand-300 underline-offset-2 hover:underline">Revealed {L} cards</Link> : `Revealed ${L} cards`} can be watched one by one.
            </li>
            <li>
              <strong className="text-slate-200">Not sure a box is worth opening?</strong> That needs real singles prices, which an unreleased set does not have yet. The <Link href="/tools/box-ev" className="text-brand-300 underline-offset-2 hover:underline">box EV calculator</Link> answers it for every set that is out and will cover {L} once it is.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            We do not forecast prices here and we will not tell you a number is going up. What this page can tell you is what every tracked seller is charging right now, in your currency.
          </p>
        </section>
      ) : null}

      {others.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-white">Also coming soon</h2>
          <p className="mt-1 text-sm text-slate-400">Other One Piece products that are not out yet, with the same comparison.</p>
          {others.map((g: PreorderGroup, gi) => (
            <div key={g.releasedOn} className="mt-6">
              <h3 className="mb-3 text-base font-bold text-slate-200">
                {g.set && PREORDER_PAGES[g.set.code] ? (
                  <Link href={PREORDER_PAGES[g.set.code]} className="hover:underline">{g.set.code} {g.set.name}</Link>
                ) : g.set ? (
                  `${g.set.code} ${g.set.name}`
                ) : (
                  "Collections"
                )}{" "}
                <span className="font-normal text-slate-500">· {shortDateOf(g.releasedOn)}</span>
              </h3>
              <div className="space-y-4">
                {otherBoards[gi].map(({ s, board }) => (
                  <PreorderProduct key={s.id} s={s} board={board} country={country} page={PAGE} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/sealed" className="btn-ghost">All sealed prices</Link>
        <Link href="/tools/box-ev" className="btn-ghost">Is a box worth opening?</Link>
        <Link href="/sets" className="btn-ghost">Every set</Link>
        <Link href="/price-guide" className="btn-ghost">Price guide</Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, OP Compare earns from qualifying purchases, at no extra cost to you.{" "}
        <Link href="/methodology" className="underline hover:text-slate-300">How we compare prices</Link>
      </p>

      <HubFaq faqs={faqs} />
    </div>
  );
}
