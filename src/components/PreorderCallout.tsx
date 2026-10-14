import Link from "next/link";
import { longDateOf } from "@/lib/preorders";

// The link from a set's page (and anywhere else a buyer looks at an unreleased
// set) to its dedicated pre-order board. The caller decides whether to render it
// through preorderPageFor (lib/preorders.ts), which returns null from release
// day on, so the callout retires itself. Styled like /sealed's pre-order banner.
export function PreorderCallout({ code, href, releasedOn, className = "" }: { code: string; href: string; releasedOn: string; className?: string }) {
  return (
    <div className={`card-surface flex flex-wrap items-center gap-3 border-amber-500/40 p-4 ${className}`}>
      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">Pre-order</span>
      <p className="min-w-0 flex-1 text-[15px] text-slate-200">
        <span className="font-semibold text-white">
          {code} is out {longDateOf(releasedOn)}.
        </span>{" "}
        Every tracked store&apos;s pre-order price beside TCGplayer and eBay, cheapest first, in your currency.
      </p>
      <Link href={href} className="btn-primary min-h-10">
        {code} pre-order prices from every tracked store →
      </Link>
    </div>
  );
}
