import type { Country } from "@/lib/country";
import { AMAZON_REL, AMAZON_STATEMENT, amazonFor, amazonSearchUrl } from "@/lib/amazon";

// Amazon on a sealed product's page (lib/amazon.ts): a search on the visitor's Amazon, no price, never a row of the board. Since
// 2026-10-30 (owner: Amazon and eBay are the first, tinted rows on every site) it sits directly ABOVE the board, shaped like a row and
// tinted in Amazon's orange, labelled "Ad", with no wording about the order. Server component (the sealed page already knows the market); nothing renders where the market has no Amazon tag. The
// click is counted like every outbound link (a[data-retailer]: ConsentGatedAnalytics, GoogleAnalytics).
export function AmazonCheck({ country, name, slug, page = "sealed" }: { country: Country; name: string; slug: string; page?: string }) {
  const a = amazonFor(country);
  const href = amazonSearchUrl(country, name, `${page}-amazon`);
  if (!a || !href) return null;
  return (
    <div className="card-surface flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-[#ff9900]/40 bg-[#ff9900]/[0.08] px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold text-white">{a.label}</span>
          <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">Ad</span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">
          We don&apos;t read Amazon&apos;s prices, so it isn&apos;t ranked with the stores below: compare its checkout total before you buy.
          Paid link. {AMAZON_STATEMENT}
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel={AMAZON_REL}
        data-retailer={`amazon_${country.toLowerCase()}`}
        data-page={page}
        data-card={slug}
        data-surface="amazon_check"
        className="btn shrink-0 whitespace-nowrap bg-[#ff9900] px-3 text-black hover:bg-[#e68a00] sm:w-48"
      >
        Check price on {a.label} →
      </a>
    </div>
  );
}
