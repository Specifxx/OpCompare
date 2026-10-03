import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { LockedPreview, MoreWithPlan } from "@/components/Upsell";
import { Breadcrumbs, EmptyState, InShort } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { COUNTRIES } from "@/lib/country";
import { getCatalog } from "@/lib/data";
import { getCountry } from "@/lib/get-country";
import { FREE_DEAL_ROWS, dealAccess } from "@/lib/plans";
import { tierOf } from "@/lib/premium";
import { biggestSavings } from "@/lib/selectors";
import { pageOg } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "One Piece Deal Finder — Cards Under Market Price",
  description:
    "One Piece Card Game cards whose cheapest listing in your market sits furthest under TCGplayer's market price.",
  alternates: { canonical: "/tools/deal-finder" },
  openGraph: pageOg("/tools/deal-finder"),
};

const FLOORS = [
  { k: "5", label: "US$5+", cents: 500 },
  { k: "25", label: "US$25+", cents: 2500 },
  { k: "100", label: "US$100+", cents: 10000 },
];

export const dynamic = "force-dynamic";

const FULL_ROWS = 60;

export default async function DealFinder({
  searchParams,
}: {
  searchParams: { min?: string };
}) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const user = await getCurrentUser();
  const access = dealAccess(Boolean(user), tierOf(user));
  const floor = FLOORS.find((f) => f.k === searchParams.min) ?? FLOORS[0];
  // Signed out: no query at all. Free account: three rows, limited in the query.
  const cat = access === "none" ? null : await getCatalog();
  const deals = cat
    ? biggestSavings(
        cat.cards,
        country,
        access === "full" ? FULL_ROWS : FREE_DEAL_ROWS,
        floor.cents,
      )
    : [];
  const href = `/tools/deal-finder${floor.k === "5" ? "" : `?min=${floor.k}`}`;
  return (
    <div className="container-app py-6">
      <Breadcrumbs
        items={[
          { href: "/tools/deal-finder", label: "Tools" },
          { label: "Deal finder" },
        ]}
      />
      <h1 className="text-3xl text-white sm:text-4xl">Deal Finder</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        Cards whose cheapest in-stock listing in {c.place} sits furthest under
        TCGplayer&apos;s market price, biggest saving first. A deal is a listing
        10–60% under market; deeper than that is far more often a damaged copy
        or a mismatched printing than a bargain, so it is left out.
      </p>
      <div className="mt-4">
        <InShort>
          Market price is what a card has recently sold for on TCGplayer,
          converted to {c.currency}. Check the condition on the store&apos;s
          page — a played copy is often why a listing is cheap.
        </InShort>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {FLOORS.map((f) => (
          <Link
            key={f.k}
            href={`/tools/deal-finder${f.k === "5" ? "" : `?min=${f.k}`}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${f.k === floor.k ? "border-brand-500 bg-brand-500/15 text-white" : "border-ink-700 text-slate-300 hover:border-ink-600"}`}
          >
            Market {f.label}
          </Link>
        ))}
      </div>
      {access === "none" ? (
        <LockedPreview
          title={`See today's top ${FREE_DEAL_ROWS} deals, free`}
          next={href}
        >
          Create a free account to see the three biggest savings in {c.place}{" "}
          right now. Plus shows every deal, at every price level, with no ads.
        </LockedPreview>
      ) : deals.length && cat ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {deals.map(({ card, saving }) => (
            <div key={card.id} className="relative">
              <span className="num absolute -top-2 left-1/2 z-[2] -translate-x-1/2 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-[#04130b]">
                Save {saving.toFixed(0)}%
              </span>
              <CardTile
                card={card}
                setCode={cat.setById.get(card.setId)?.code ?? ""}
                country={country}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState title={`No deals in ${c.place} right now`}>
            No {c.adjective} listing is 10% or more under TCGplayer&apos;s
            market price at this price level.
          </EmptyState>
        </div>
      )}
      {access === "top3" && deals.length === FREE_DEAL_ROWS ? (
        <MoreWithPlan>
          These are the top {FREE_DEAL_ROWS}. Plus shows every deal in {c.place}
          , at every price level, with no ads.
        </MoreWithPlan>
      ) : null}
    </div>
  );
}
