import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Faq, InShort, JsonLd } from "@/components/ui";
import { faqLd } from "@/lib/jsonld";
import { pageOg } from "@/lib/og/meta";
import { FEE_SCHEDULES, FEES_CHECKED } from "@/lib/selling-fees";
import { SITE_URL } from "@/lib/site";
import { FeeCalculator } from "./FeeCalculator";
import { DATA_TABLE } from "@/components/prose";

// /tools/selling-fees — what a seller keeps (RiftCompare's selling fee
// calculator). Pure: no data reads. The schedules live in lib/selling-fees.ts,
// each dated and sourced; an unconfirmed rate is left for the seller to enter.
export const metadata: Metadata = {
  title: "One Piece Card Selling Fee Calculator — TCGplayer, eBay, Cardmarket",
  description:
    "What you keep selling a One Piece card on TCGplayer, eBay or Cardmarket: commission, payment processing, per-order fees and postage, with each marketplace's published rates dated and sourced.",
  alternates: { canonical: "/tools/selling-fees" },
  openGraph: pageOg("/tools/selling-fees"),
};

const FAQS = [
  {
    q: "How much does TCGplayer take from a One Piece card sale?",
    a: "For a standard marketplace seller, a 10.75% commission on the item price (capped at $75 per item) plus 2.5% + $0.30 payment processing on the item price and postage, per TCGplayer's fee page as checked on " + FEES_CHECKED + ". Pro and Direct sellers pay different rates.",
  },
  {
    q: "How much does eBay take?",
    a: "On eBay.com, trading cards sold without an eBay Store pay a 13.25% final value fee on the whole sale, postage included, up to $7,500 (2.35% above), plus $0.30 per order ($0.40 over $10). UK-based private sellers on eBay.co.uk pay no final value fee. Other eBay sites: enter the rate from your Seller Hub.",
  },
  {
    q: "Why are some commission boxes empty?",
    a: "Where we could not confirm a marketplace's current rate on its own fee page (Cardmarket, eBay Australia, eBay Canada), the box is left for you to fill in. A stale percentage would print a payout that looks exact and is wrong.",
  },
  {
    q: "Does it include my own postage cost?",
    a: "Yes. Enter what you charge the buyer and what the mailer and stamp cost you separately: fees apply to what the buyer pays, and your own cost comes off the payout.",
  },
];

export default function SellingFeesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "One Piece Card Selling Fee Calculator",
          url: `${SITE_URL}/tools/selling-fees`,
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
      <JsonLd data={faqLd(FAQS)} />
      <Breadcrumbs trail={[{ href: "/tools", name: "Tools" }, { name: "Selling Fee Calculator" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">Selling fee calculator</h1>
      <p className="mt-3 mb-5 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        What you actually keep selling a One Piece card: the marketplace&apos;s commission, payment processing, its per-order fee and your own postage,
        stacked the way each marketplace charges them.
      </p>
      <FeeCalculator />
      <div className="mt-6">
        <InShort>
          Fee schedules change. Each rate above links to the marketplace page it came from, checked on {FEES_CHECKED}; confirm yours in your seller
          account before you price a listing. Before you list, check the going price on the{" "}
          <Link href="/price-guide" className="text-brand-400 hover:underline">
            price guide
          </Link>
          .
        </InShort>
      </div>
      <section className="card-surface mt-6 overflow-x-auto p-5">
        <h2 className="text-lg text-white">The schedules, and where they come from</h2>
        <table className={`${DATA_TABLE} mt-3 min-w-[560px]`}>
          <thead>
            <tr>
              <th>Marketplace</th>
              <th className="text-right">Commission</th>
              <th className="text-right">Processing</th>
              <th className="text-right">Per order</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {FEE_SCHEDULES.filter((s) => s.id !== "custom").map((s) => (
              <tr key={s.id}>
                <td className="font-semibold text-white">{s.label}</td>
                <td className="num text-right text-slate-200">{s.commissionPct == null ? "enter yours" : `${s.commissionPct}%`}</td>
                <td className="num text-right text-slate-200">{s.processingPct ? `${s.processingPct}%` : "—"}</td>
                <td className="num text-right text-slate-200">{s.fixedFee ? s.fixedFee.toFixed(2) : "—"}</td>
                <td>
                  <a href={s.source.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline text-xs">
                    {s.source.label}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-2xl text-white">Questions</h2>
        <Faq items={FAQS} />
      </section>
    </div>
  );
}
