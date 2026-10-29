import type { Country } from "@/lib/country";
import { AMAZON_REL, AMAZON_STATEMENT, amazonFor, amazonSearchUrl } from "@/lib/amazon";

// "Also on Amazon" under a sealed product's price board (lib/amazon.ts): a search on the visitor's Amazon, no price, never a row of
// the board. Server component (the sealed page already knows the market); nothing renders where the market has no Amazon tag. The
// click is counted like every outbound link (a[data-retailer]: ConsentGatedAnalytics, GoogleAnalytics).
export function AmazonCheck({ country, name, slug, page = "sealed" }: { country: Country; name: string; slug: string; page?: string }) {
  const a = amazonFor(country);
  const href = amazonSearchUrl(country, name, `${page}-amazon`);
  if (!a || !href) return null;
  return (
    <div className="card-surface flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-white">Also on {a.label}</span>
          <span className="chip bg-ink-800 text-[11px] text-slate-400">marketplace</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
          We don&apos;t read Amazon&apos;s prices, so it isn&apos;t ranked with the stores above: compare its checkout total before you buy.
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
        className="btn-ghost shrink-0"
      >
        Check price on {a.label} →
      </a>
    </div>
  );
}
