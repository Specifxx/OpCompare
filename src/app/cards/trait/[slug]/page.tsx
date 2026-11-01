import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardLinkGrid } from "@/components/CardLinkGrid";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs, InShort, JsonLd, SectionHeader } from "@/components/ui";
import { COLORS, COLOR_KEYS } from "@/lib/constants";
import { COUNTRIES } from "@/lib/country";
import { getCardText, getCatalog, type CardLite } from "@/lib/data";
import { basePrinting } from "@/lib/deck";
import { leaderSlug, pageSuffix, paginate } from "@/lib/facets";
import { int, money } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { faqLd } from "@/lib/jsonld";
import { pageOg } from "@/lib/og/meta";
import { median } from "@/lib/selectors";
import { traitHubs } from "@/lib/traits";

// /cards/trait/[slug] — one card type ("Straw Hat Crew"): every card number
// that carries it, its base printing, most valuable first (lib/traits.ts, the
// cached getCardText index). Like /keywords/[slug]: rendered on demand.
type Props = { params: { slug: string }; searchParams: { page?: string } };
const PER = 48;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const hub = traitHubs(await getCardText()).find((h) => h.slug === params.slug);
  if (!hub) return { title: "Not found" };
  return {
    title: `${hub.name} One Piece Cards — Prices & Every Card`,
    description: `All ${hub.numbers.size} One Piece Card Game cards with the ${hub.name} type, most valuable first, with live prices compared across stores in six markets.`,
    alternates: { canonical: `/cards/trait/${hub.slug}${pageSuffix(searchParams.page)}` },
    openGraph: pageOg(`/cards/trait/${hub.slug}${pageSuffix(searchParams.page)}`),
  };
}

export default async function TraitPage({ params, searchParams }: Props) {
  const country = getCountry();
  const [cat, text] = await Promise.all([getCatalog(), getCardText()]);
  const hubs = traitHubs(text);
  const hub = hubs.find((h) => h.slug === params.slug);
  if (!hub) notFound();
  const byNumber = new Map<string, CardLite[]>();
  for (const c of cat.cards) if (c.number && c.printing !== "don" && hub.numbers.has(c.number)) (byNumber.get(c.number) ?? byNumber.set(c.number, []).get(c.number)!).push(c);
  const cards = [...byNumber.values()].map((ps) => basePrinting(ps)!).sort((a, b) => (b.marketUsd ?? -1) - (a.marketUsd ?? -1) || a.id - b.id);
  const all = [...byNumber.values()].flat();
  const top = [...all].sort((a, b) => (b.marketUsd ?? -1) - (a.marketUsd ?? -1))[0];
  const med = median(cards.map((c) => c.marketUsd).filter((v): v is number => v != null));
  const leaders = cards.filter((c) => c.cardType === "Leader");
  const colors = COLOR_KEYS.map((k) => ({ k, n: cards.filter((c) => c.colors.includes(k)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const { page, pages, slice } = paginate(cards, searchParams.page, PER);
  const path = `/cards/trait/${hub.slug}`;
  return (
    <div>
      <JsonLd data={faqLd([{ q: `How many ${hub.name} cards are there in the One Piece Card Game?`, a: `${int(cards.length)} card numbers carry the ${hub.name} type, ${int(all.length)} printings in all${leaders.length ? `, including ${leaders.length} Leader${leaders.length === 1 ? "" : "s"}` : ""}.` }])} />
      <Breadcrumbs trail={[{ href: "/cards", name: "Cards" }, { href: "/cards/trait", name: "Types" }, { name: hub.name }]} />
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{hub.name} One Piece cards</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        Every One Piece Card Game card whose type line says {hub.name}: {int(cards.length)} card numbers and {int(all.length)} printings
        {colors.length ? `, most of them ${colors.slice(0, 2).map((x) => COLORS[x.k].label).join(" and ")}` : ""}. Each tile is the card&apos;s standard print with the cheapest
        in-stock listing in {COUNTRIES[country].place}; open it for every printing and store.
      </p>
      <div className="mt-6">
        <InShort>
          The median {hub.name} card&apos;s TCGplayer market price is {money(med, "US")}.
          {top?.marketUsd ? <> The most valuable printing is <Link href={`/card/${top.slug}`} className="text-brand-400 hover:underline">{top.name}{top.variant ? ` (${top.variant})` : ""}</Link> at {money(top.marketUsd, "US")}.</> : null}
          {leaders.length ? <> Leaders with the type: {leaders.slice(0, 6).map((l, i) => <span key={l.id}>{i ? ", " : ""}<Link href={`/leaders/${leaderSlug(l.name, l.number)}`} className="text-brand-400 hover:underline">{l.name} ({l.number})</Link></span>)}.</> : null}
        </InShort>
      </div>
      <section className="mt-8">
        <SectionHeader title={`${int(cards.length)} ${hub.name} cards`} sub={`most valuable first, cheapest listing in ${COUNTRIES[country].place}${pages > 1 ? ` · page ${page} of ${pages}` : ""}`} />
        <CardLinkGrid cards={slice} cat={cat} country={country} />
        <Pagination page={page} totalPages={pages} params={{}} basePath={path} />
      </section>
      <nav className="mt-10" aria-label="Other types">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Other types</h2>
        <ul className="flex flex-wrap gap-2">
          {hubs.filter((x) => x.slug !== hub.slug).slice(0, 40).map((x) => (
            <li key={x.slug}>
              <Link href={`/cards/trait/${x.slug}`} className="chip border border-ink-700 bg-ink-850 text-slate-200 hover:border-ink-600">{x.name}</Link>
            </li>
          ))}
          <li><Link href="/cards/trait" className="chip border border-ink-700 bg-ink-850 text-brand-400 hover:border-ink-600">All {hubs.length} types →</Link></li>
        </ul>
      </nav>
    </div>
  );
}
