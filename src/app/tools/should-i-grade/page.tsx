import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { GradeCalculator } from "@/components/GradeCalculator";
import { getGradedGuide } from "@/lib/data";
import { gradeRows } from "@/lib/grade-math";
import { pageOg } from "@/lib/og/meta";
import { SITE_URL } from "@/lib/site";

// /tools/should-i-grade (DECISIONS.md, "Should I grade this? calculator",
// 2026-11-18): raw price vs live PSA 10 / PSA 9 asks, at the visitor's own odds
// and grading cost. US rows of the /graded guide only (USD, no conversion), read
// through the six-hour getGradedGuide loader: a visit costs no query. Never reads
// a cookie, so every market sees the same US page.
export const revalidate = 21600;

const TITLE = "Should I Grade This One Piece Card? Free PSA Calculator";
const DESCRIPTION =
  "Is your One Piece card worth grading? Pick the card, set your chance of a PSA 10 and your grading cost, and see the break-even from live PSA 10 and PSA 9 eBay prices against TCGplayer's raw price.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OP Compare` },
  description: DESCRIPTION,
  alternates: { canonical: "/tools/should-i-grade" },
  openGraph: pageOg("/tools/should-i-grade", { title: TITLE, description: DESCRIPTION }),
};

const FAQS = [
  {
    q: "How does the calculator decide?",
    a: "It averages what a graded copy is worth at your odds: your chance of a 10 times the cheapest live PSA 10 listing, plus the rest at the cheapest PSA 9 listing (or the raw price when no PSA 9 is listed). Take away the raw price and you get the most grading can cost before it stops paying.",
  },
  {
    q: "Why don't you fill in the grading fee?",
    a: "Graders change their service tiers and prices often, and the right tier depends on the card's value. Type what you will actually pay per card, including postage both ways, and the verdict uses your number.",
  },
  {
    q: "Are these sale prices?",
    a: "No. They are the cheapest live eBay asking prices in the United States, refreshed every couple of days, beside TCGplayer's raw market price. A slab can sell for less than its asking price, so treat a small margin as no margin.",
  },
];

export default async function ShouldIGradePage() {
  const rows = gradeRows(await getGradedGuide("US").catch(() => []));
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Should I Grade This? One Piece PSA calculator",
      url: `${SITE_URL}/tools/should-i-grade`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Breadcrumbs trail={[{ href: "/tools", name: "Tools" }, { name: "Should I grade this?" }]} />
      <h1 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">Should I grade this card?</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {rows.length} One Piece cards have a live PSA 10 on eBay in the US today. Pick yours, set your odds and your grading cost, and
        see whether the slab is worth more than the raw card. Prices are in US dollars.
      </p>
      <div className="mt-5">
        <GradeCalculator rows={rows} />
      </div>
      <section className="card-surface mt-6 divide-y divide-ink-800 overflow-hidden">
        <h2 className="px-6 py-4 text-lg font-extrabold text-white">Frequently asked questions</h2>
        {FAQS.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-semibold text-slate-200 hover:text-white [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden>▾</span>
            </summary>
            <p className="px-6 pb-4 text-sm leading-relaxed text-slate-400">{f.a}</p>
          </details>
        ))}
      </section>
      <p className="mt-6 text-center text-sm text-slate-500">
        Every graded price, card by card: <Link href="/graded" prefetch={false} className="text-brand-400 hover:underline">One Piece graded price guide</Link>.
      </p>
    </div>
  );
}
