import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import PlanButton from "@/components/PlanButton";
import { Breadcrumbs, InShort } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { COUNTRIES } from "@/lib/country";
import { getCountry } from "@/lib/get-country";
import { planPrice } from "@/lib/plans";
import { isPremium, tierOf } from "@/lib/premium";
import { BuyListPlanner } from "./BuyListPlanner";
import { pageOg } from "@/lib/og/meta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Buy List Planner — The Cheapest Stores for Your One Piece Cards",
  description:
    "Paste a One Piece decklist or use your watchlist: see what it costs with a free account, and with Premium the cheapest single store and the cheapest split across stores, at the condition you want.",
  alternates: { canonical: "/tools/buy-list" },
  openGraph: pageOg("/tools/buy-list"),
};

export default async function BuyList({ searchParams }: { searchParams: { list?: string | string[] } }) {
  const user = await getCurrentUser();
  const c = COUNTRIES[getCountry()];
  const premium = isPremium(user, "premium");
  const tier = tierOf(user);
  const list = (Array.isArray(searchParams.list) ? searchParams.list[0] : searchParams.list) ?? "";
  const next = `/tools/buy-list${list ? `?list=${encodeURIComponent(list)}` : ""}`;
  return (
    <div>
      <Breadcrumbs
        trail={[
          { href: "/tools", name: "Tools" },
          { name: "Buy List Planner" },
        ]}
      />
      <h1 className="text-3xl text-white sm:text-4xl">Buy List Planner</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        Paste a decklist or plan the cards and sealed products on your watchlist: the one store in {c.place} that stocks the most of your list for the
        least, and the cheapest way to split it across stores, at the condition you want.
      </p>
      <div className="mt-4">
        <InShort>
          Totals are item prices only, in {c.currency}. Postage differs by store, so check it before you split an order across many shops. TCGplayer
          counts as one store here, but its cheapest listings often come from different sellers and conditions, so it is left out when you ask for Near
          Mint or Lightly Played.
        </InShort>
      </div>
      {user ? (
        <>
          <BuyListPlanner place={c.place} premium={premium} initialList={list.slice(0, 6000)} />
          {!premium ? (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-gold/30 bg-gold/[0.05] p-6 text-center">
              <Icon name="crown" className="h-7 w-7 text-gold" />
              <p className="mt-2 text-lg font-bold text-white">See which stores to buy from</p>
              <p className="mt-1 max-w-md text-sm text-slate-300">
                {tier === "plus"
                  ? "You're on Plus. Premium adds the store-by-store plan (the cheapest single stores and the cheapest split) and a minimum condition. Switch plans from your account and the difference is prorated."
                  : `Your total is free. Premium (${planPrice("premium", "month")}/mo) shows the store-by-store plan: the cheapest single stores and the cheapest split, with links to each listing, at the minimum condition you set, with no ads and every Deal Finder deal.`}
              </p>
              <div className="mt-4">
                {tier === "plus" ? (
                  <Link href="/premium" className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
                    Switch to Premium
                  </Link>
                ) : (
                  <PlanButton surface="gate:buy-list" tier="premium" className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
                    See Premium
                  </PlanButton>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-ink-700 bg-ink-900 p-8 text-center">
          <Icon name="crown" className="h-7 w-7 text-gold" />
          <p className="mt-2 text-xl font-bold text-white">Log in to plan your list</p>
          <p className="mt-1 max-w-md text-sm text-slate-300">
            A free account shows what your list costs in {c.place}. Premium ({planPrice("premium", "month")}/mo) adds which stores to buy it from.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href={`/login?next=${encodeURIComponent(next)}`} rel="nofollow" className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
              Log in
            </Link>
            <PlanButton surface="gate:buy-list" tier="premium" className="rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-semibold text-white">
              See Premium
            </PlanButton>
          </div>
          {list ? (
            <p className="mt-4 text-xs text-slate-400">
              Just want the price?{" "}
              <Link href={`/deck?list=${encodeURIComponent(list)}`} className="text-brand-400 hover:underline">
                Price this list free in the deck calculator
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
