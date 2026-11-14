import Link from "next/link";
import { longDateOf } from "@/lib/preorders";

// The link from a set's page (and anywhere else a buyer looks at an unreleased
// set) to its dedicated pre-order board. The caller decides whether to render it
// through preorderPageFor (lib/preorders.ts), which returns null from release
// day on, so the callout retires itself. Styled like /sealed's pre-order strip
// (2026-11-14): neutral, an outlined button, and on a phone the words take the
// full width instead of a narrow column beside the chip.
export function PreorderCallout({ code, href, releasedOn, className = "" }: { code: string; href: string; releasedOn: string; className?: string }) {
  return (
    <div className={`card-surface flex flex-wrap items-center gap-3 p-4 ${className}`}>
      <span className="rounded bg-ink-800 px-2 py-0.5 text-xs font-bold text-slate-300">Pre-order</span>
      <p className="min-w-0 basis-full text-[15px] text-slate-200 sm:basis-0 sm:flex-1">
        <span className="font-semibold text-white">
          {code} is out {longDateOf(releasedOn)}.
        </span>{" "}
        Every tracked store&apos;s pre-order price beside TCGplayer and eBay, cheapest first, in your currency.
      </p>
      <Link href={href} className="btn-ghost min-h-10 whitespace-normal text-left">
        {code} pre-order prices from every tracked store →
      </Link>
    </div>
  );
}
