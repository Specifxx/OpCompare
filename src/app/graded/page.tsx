import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { Breadcrumbs } from "@/components/ui";
import { cardEbayQuery, ebaySearchUrl, outboundRel } from "@/lib/affiliate";
import { COUNTRIES } from "@/lib/country";
import { getGradedGuide } from "@/lib/data";
import { moneyCode, usd } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { GUIDE_GRADES } from "@/lib/graded-guide";
import { pageOg } from "@/lib/og/meta";

// /graded — the graded price guide (lib/graded-guide.ts; DECISIONS.md, "Graded
// price guide", 2026-10-27). Per market, like the price guide: the rows come
// from getGradedGuide, a six-hour snapshot loader, so a visit costs no query.

const TITLE = "One Piece PSA 10 & Graded Card Prices";
const DESCRIPTION =
  "What a PSA 10, PSA 9, BGS or CGC graded One Piece card costs on eBay in your market: the cheapest live listing of each grade, beside TCGplayer's raw market price.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/graded" },
  openGraph: pageOg("/graded", { title: TITLE, description: DESCRIPTION }),
};

export default async function GradedGuidePage() {
  const country = getCountry();
  const c = COUNTRIES[country];
  const rows = await getGradedGuide(country).catch(() => []);
  return (
    <div>
      <Breadcrumbs trail={[{ name: "Graded prices" }]} />
      <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">{TITLE}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
        The cheapest live eBay listing for each grade of every One Piece card with a graded copy for sale in {c.place}, beside
        TCGplayer&apos;s market price for a raw copy. These are <strong className="text-slate-200">asking prices</strong>, not
        sales, item price before postage, refreshed every couple of days. A grade column is empty when none was listed.
      </p>
      <AffiliateDisclosure partner="ebay" />

      {rows.length === 0 ? (
        <p className="card mt-6 p-6 text-sm text-slate-400">
          No graded listings in {c.place} right now. Each card page lists its graded copies under the eBay panel when there are some.
        </p>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="px-3 py-2.5 font-semibold">Card</th>
                {GUIDE_GRADES.map((g) => (
                  <th key={g} className="px-2 py-2.5 text-right font-semibold">{g}</th>
                ))}
                <th className="px-2 py-2.5 text-right font-semibold">Raw (TCGplayer)</th>
                <th className="px-3 py-2.5 font-semibold">eBay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug} className="border-t border-ink-700 align-middle">
                  <td className="px-3 py-2">
                    <Link href={`/card/${r.slug}`} prefetch={false} className="font-semibold text-white hover:text-brand-300">{r.name}</Link>
                    <span className="block text-xs text-slate-500">{[r.number, r.variant].filter(Boolean).join(" · ")}</span>
                  </td>
                  {GUIDE_GRADES.map((g) => (
                    <td key={g} className="num px-2 py-2 text-right text-slate-200">
                      {r.prices[g] != null ? moneyCode(r.prices[g], r.currency) : <span className="text-slate-600">–</span>}
                    </td>
                  ))}
                  <td className="num px-2 py-2 text-right text-slate-400">{r.marketUsd != null ? usd(r.marketUsd) : <span className="text-slate-600">–</span>}</td>
                  <td className="px-3 py-2 text-xs">
                    <a
                      href={ebaySearchUrl(country, `${cardEbayQuery(r)} ${r.top.grade}`, "graded-guide")}
                      target="_blank"
                      rel={outboundRel()}
                      data-retailer="ebay_search"
                      data-page="graded"
                      data-card={r.slug}
                      data-surface="ebay_graded"
                      className="font-semibold text-brand-300 hover:underline"
                    >
                      {r.top.grade} on eBay
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="card mt-6 p-5 text-sm leading-relaxed text-slate-400">
        <h2 className="font-bold text-white">How to read this</h2>
        <p className="mt-2">
          The cheapest listing of a grade is the most you should need to pay for that grade today, not what it will sell for. Compare
          it with the raw price to see roughly what grading adds to a card. Open a card for every graded listing and every store
          selling it raw.
        </p>
      </section>
    </div>
  );
}
