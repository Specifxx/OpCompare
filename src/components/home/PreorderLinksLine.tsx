import Link from "next/link";
import type { PreorderLink } from "@/lib/preorders";
import { shortDateOf } from "@/lib/preorders";

// One centred line under the next-set countdown: "Pre-orders open · EB05 30 Oct →
// · OP18 20 Nov →", a link to each unreleased set's pre-order board. Built from
// PREORDER_PAGES and the catalogue's release dates (upcomingPreorderPages), so a
// set drops out on its release day and the line disappears when none is left.
// Static like the rest of the homepage: no cookie, header or session read.
export function PreorderLinksLine({ links }: { links: PreorderLink[] }) {
  if (!links.length) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-slate-400">
      <span className="chip bg-gold/15 text-[11px] font-bold uppercase tracking-wider text-gold">Pre-orders open</span>
      {links.map((l) => (
        <Link key={l.code} href={l.href} className="tap-link font-semibold text-brand-300 underline-offset-2 hover:underline" title={`${l.name}: pre-order prices from every tracked store`}>
          {l.code} · {shortDateOf(l.releasedOn)} →
        </Link>
      ))}
    </p>
  );
}
