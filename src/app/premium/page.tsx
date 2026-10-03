import type { Metadata } from "next";
import { PricingCards } from "@/components/PricingCards";
import { Faq, JsonLd } from "@/components/ui";
import {
  PLAN_CENTS,
  TIER_COMPARISON,
  TIER_NAMES,
  TIERS,
  planPrice,
} from "@/lib/plans";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { stripeEnabled } from "@/lib/stripe";
import { pageOg } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Plus & Premium — Every Deal, No Ads, a Store Plan for Your List",
  description: `Comparing One Piece card prices on ${SITE_NAME} is free. Plus (${planPrice("plus", "month")}/mo) shows every Deal Finder deal with no ads; Premium (${planPrice("premium", "month")}/mo) plans which stores to buy your list from.`,
  alternates: { canonical: "/premium" },
  openGraph: pageOg("/premium"),
};

const FAQ = [
  {
    q: "Is OP Compare still free?",
    a: "Yes. Every card price, every store, the price guide, sets, sealed, movers and the watchlist stay free with no account. Plus and Premium add tools on top.",
  },
  {
    q: "What does the Deal Finder show without a plan?",
    a: "Signed out, a preview of how it works. With a free account, the top 3 deals in your market. Plus and Premium show every deal at every price level.",
  },
  {
    q: "What is the Buy List Planner?",
    a: "Give it your watchlist and your market, and it works out the cheapest single store that has your cards, and the cheapest way to split the order across stores. Shipping isn't included, so check each store's postage.",
  },
  {
    q: "How do I cancel?",
    a: "From your account page: Manage subscription opens Stripe's billing portal, where you can cancel, switch between Plus and Premium or monthly and yearly, and see invoices. You keep access to the end of the period you paid for.",
  },
  {
    q: "Who handles the payment?",
    a: "Stripe. We never see or store your card details.",
  },
];

export default function Premium() {
  const open = stripeEnabled();
  return (
    <div className="container-app py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${SITE_NAME} Plus and Premium`,
          url: `${SITE_URL}/premium`,
          offers: TIERS.map((t) => ({
            "@type": "Offer",
            name: TIER_NAMES[t],
            price: (PLAN_CENTS[t].month / 100).toFixed(2),
            priceCurrency: "USD",
          })),
        }}
      />
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-straw">
          Plus &amp; Premium
        </p>
        <h1 className="mt-2 text-4xl text-white sm:text-5xl">
          Find the deals. Buy them for less.
        </h1>
        <p className="mt-3 text-[15px] text-slate-300">
          Comparing prices is free. Plus shows every deal with no ads; Premium
          plans which stores to buy your list from.
        </p>
      </div>
      <div className="mt-8">
        <PricingCards checkoutOpen={open} />
      </div>
      <div className="mx-auto mt-12 max-w-3xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-slate-400">
              <th className="py-2 pr-3 font-medium">What you get</th>
              <th className="px-3 py-2 font-medium">Free account</th>
              <th className="px-3 py-2 font-medium">Plus</th>
              <th className="px-3 py-2 font-medium">Premium</th>
            </tr>
          </thead>
          <tbody>
            {TIER_COMPARISON.map(([f, free, plus, prem]) => (
              <tr key={f} className="border-b border-ink-800">
                <td className="py-2.5 pr-3 text-slate-200">{f}</td>
                <td className="px-3 py-2.5 text-slate-300">{free}</td>
                <td className="px-3 py-2.5 text-slate-300">{plus}</td>
                <td className="px-3 py-2.5 text-slate-300">{prem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="mb-3 text-2xl text-white">Questions</h2>
        <Faq items={FAQ} />
      </div>
    </div>
  );
}
