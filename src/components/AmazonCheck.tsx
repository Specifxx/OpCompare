import type { Country } from "@/lib/country";
import { AMAZON_REL, AMAZON_STATEMENT, amazonFor, amazonSearchUrl } from "@/lib/amazon";

// Amazon on a sealed product's page (lib/amazon.ts): a search on the visitor's Amazon, no price, never ranked. Since
// 2026-11-03 (owner: Amazon "up there with eBay and TCGplayer … the third row out of the three") it is a row OF the board,
// passed in through PriceBoard's `thirdRow` slot and drawn right after the pinned eBay and TCGplayer rows (first when neither
// is shown); until then it sat above the board, which put it first. Drawn like a store row, labelled "Ad", with no wording
// about the order. Never in Amazon's own colours (2026-11-02: Amazon Associates' rules forbid styling that could pass for
// Amazon's site). Server component (the sealed page already knows the market); nothing renders where the market has no
// Amazon tag. The click is counted like every outbound link (a[data-retailer]: ConsentGatedAnalytics, GoogleAnalytics).
export function AmazonCheck({ country, name, slug, page = "sealed" }: { country: Country; name: string; slug: string; page?: string }) {
  const a = amazonFor(country);
  const href = amazonSearchUrl(country, name, `${page}-amazon`);
  if (!a || !href) return null;
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-white">{a.label}</span>
          <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">Ad</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          We don&apos;t read Amazon&apos;s prices, so it isn&apos;t ranked with the stores: compare its checkout total before you buy.{" "}
          <span className="hidden sm:inline">{AMAZON_STATEMENT}</span>
        </p>
      </div>
      <span className="shrink-0 text-right text-xs text-slate-400">See price</span>
      <a
        href={href}
        target="_blank"
        rel={AMAZON_REL}
        data-retailer={`amazon_${country.toLowerCase()}`}
        data-page={page}
        data-card={slug}
        data-surface="amazon_check"
        className="btn-primary hidden shrink-0 whitespace-nowrap sm:inline-flex sm:w-48"
      >
        Check price →
      </a>
      <a
        href={href}
        target="_blank"
        rel={AMAZON_REL}
        data-retailer={`amazon_${country.toLowerCase()}`}
        data-page={page}
        data-card={slug}
        data-surface="amazon_check"
        className="btn-primary shrink-0 px-3 sm:hidden"
        aria-label={`Check price on ${a.label}`}
      >
        →
      </a>
    </li>
  );
}
