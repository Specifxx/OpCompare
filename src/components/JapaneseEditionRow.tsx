"use client";

// The "Japanese edition" row on an English booster box page (lib/japanese-edition.ts): a tagged eBay search for the same
// set's Japanese box, labelled a different product, with no price and no ranking. Each tap is one `ja_edition` event.
import { trackEvent } from "@/lib/analytics";

export function JapaneseEditionRow({ href, code, setName, ebayName, slug }: { href: string; code: string; setName: string; ebayName: string; slug: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      data-retailer="ebay_search"
      data-page="sealed"
      data-card={slug}
      data-surface="ja_edition"
      onClick={() => trackEvent("ja_edition", { set: code })}
      className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-900 px-5 py-4 hover:border-ink-700"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Japanese edition</span>
        <span className="font-semibold text-white">{setName} Japanese booster box ({code})</span>
        <span className="block text-sm text-slate-400">
          A different product: Japanese text, its own pack size and box price. We don&rsquo;t compare it with the English stores above. Paid link, a
          search on {ebayName}.
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-brand-400">Search {ebayName} ↗</span>
    </a>
  );
}
