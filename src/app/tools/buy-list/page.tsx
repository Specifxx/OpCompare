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
    "Premium: the cheapest single store for your One Piece Card Game watchlist, and the cheapest way to split it across stores, in your market.",
  alternates: { canonical: "/tools/buy-list" },
  openGraph: pageOg("/tools/buy-list"),
};

export default async function BuyList() {
  const user = await getCurrentUser();
  const c = COUNTRIES[getCountry()];
  const premium = isPremium(user, "premium");
  return (
    <div className="container-app py-6">
      <Breadcrumbs
        items={[
          { href: "/tools/deal-finder", label: "Tools" },
          { label: "Buy List Planner" },
        ]}
      />
      <h1 className="text-3xl text-white sm:text-4xl">Buy List Planner</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        Heart the cards and sealed products you want, then plan the order: the
        one store in {c.place} that stocks the most of your list for the least,
        and the cheapest way to split it across stores.
      </p>
      <div className="mt-4">
        <InShort>
          Totals are item prices only, in {c.currency}. Postage differs by
          store, so check it before you split an order across many shops.
          TCGplayer counts as one store here, but its cheapest listings often
          come from different sellers.
        </InShort>
      </div>
      {premium ? (
        <BuyListPlanner place={c.place} />
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-straw/30 bg-straw/[0.05] p-8 text-center">
          <Icon name="crown" className="h-7 w-7 text-straw" />
          <p className="mt-2 text-xl font-bold text-white">Part of Premium</p>
          <p className="mt-1 max-w-md text-sm text-slate-300">
            {tierOf(user) === "plus"
              ? "You're on Plus. Premium adds the Buy List Planner; switch plans from your account and the difference is prorated."
              : `Premium (${planPrice("premium", "month")}/mo) plans your whole list across every store we read, with no ads and every Deal Finder deal.`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <PlanButton
              surface="gate:buy-list"
              tier="premium"
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
            >
              {tierOf(user) === "plus" ? "Switch to Premium" : "See Premium"}
            </PlanButton>
            {!user ? (
              <Link
                href="/login?next=/tools/buy-list"
                rel="nofollow"
                className="rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Log in
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
