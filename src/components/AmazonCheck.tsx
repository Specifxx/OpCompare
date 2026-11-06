import type { Country } from "@/lib/country";
import { AMAZON_STATEMENT, amazonFor, amazonSearchUrl } from "@/lib/amazon";
import { AmazonLiveSlot } from "./AmazonLiveSlot";
import { StoreVote } from "./StoreVote";
import { PIN_OUTLINE } from "@/lib/pinned-order";

// Amazon on a sealed product's page (lib/amazon.ts): the visitor's Amazon, never ranked. Since 2026-11-05 the row's
// client slot (AmazonLiveSlot) asks /api/amazon/sealed/<slug> for Amazon's own price (lib/amazon-live.ts) and shows
// it with its time for 24 hours where the store's account has Creators API access; otherwise it is a search. Since
// 2026-11-03 (owner: Amazon "up there with eBay and TCGplayer … the third row out of the three") it is a row OF the board,
// passed in through PriceBoard's `thirdRow` slot and drawn right after the pinned eBay and TCGplayer rows (first when neither
// is shown); until then it sat above the board, which put it first. Drawn like a store row, labelled "Ad", with no wording
// about the order. Never in Amazon's own colours (2026-11-02: Amazon Associates' rules forbid styling that could pass for
// Amazon's site). Since 2026-11-06 (owner: eBay and Amazon rows "function exactly like a normal store price row … it just
// sits on the very top. And it has a different colored outline") it is the second row, right under eBay, with an amber
// outline, the store row's thumbs and, with a live price, its stock line and cart button; without one it reads "Also check
// on Amazon". Server component (the sealed page already knows the market); nothing renders where the market has no
// Amazon tag. The click is counted like every outbound link (a[data-retailer]: ConsentGatedAnalytics, GoogleAnalytics).
export function AmazonCheck({ country, name, slug, page = "sealed", image = null }: { country: Country; name: string; slug: string; page?: string; image?: string | null }) {
  const a = amazonFor(country);
  const href = amazonSearchUrl(country, name, `${page}-amazon`);
  if (!a || !href) return null;
  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 ${PIN_OUTLINE.amazon}`}>
      <span className="w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-white">{a.label}</span>
          <StoreVote url={href} name={a.label} className="text-slate-400" />
          <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">Ad</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Also check the price on Amazon: its own price and stock, not ranked with the stores.{" "}
          <span className="hidden sm:inline">{AMAZON_STATEMENT}</span>
        </p>
      </div>
      {/* Amazon's own price from the Creators API when this store's account has access (owner, 2026-11-05), else the search. */}
      <AmazonLiveSlot country={country} slug={slug} label={a.label} searchHref={href} page={page} cart={{ title: name, image }} />
    </li>
  );
}
