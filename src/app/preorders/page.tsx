import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { getCatalog } from "@/lib/data";
import { pageOg } from "@/lib/og/meta";
import { daysUntil, longDateOf, upcomingPreorderPages } from "@/lib/preorders";

// /preorders: every unreleased set's pre-order page (dedicated or automatic,
// lib/preorders.ts), soonest release first. The nav's "Pre-orders" link points
// here, so it never needs swapping when a set releases (2026-11-02). Static like
// the homepage: no cookie, header or session read.
export const revalidate = 21600;

export const metadata: Metadata = {
  title: "One Piece Card Game Pre-Orders: Every Upcoming Set Compared",
  description: "Every upcoming One Piece Card Game set with its own pre-order price comparison: booster boxes, cases and packs from every tracked store, TCGplayer and eBay, with release dates.",
  alternates: { canonical: "/preorders" },
  openGraph: pageOg("/preorders"),
};

export default async function PreordersHub() {
  const today = new Date().toISOString().slice(0, 10);
  const cat = await getCatalog();
  const links = upcomingPreorderPages(cat.sets, today);
  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs trail={[{ href: "/sealed", name: "Sealed" }, { name: "Pre-orders" }]} />
      <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">One Piece pre-order prices</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Every upcoming One Piece Card Game set has its own page comparing every tracked store&apos;s pre-order price for its booster boxes, cases and packs, next to TCGplayer and eBay, in your currency. A set appears here as soon as TCGplayer lists it and leaves on its release day.
      </p>
      {links.length ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {links.map((l) => {
            const days = daysUntil(l.releasedOn, today);
            return (
              <li key={l.code}>
                <Link href={l.href} className="card-surface block p-4 hover:border-brand-400/40">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gold [font-feature-settings:'lnum'_1]">
                    Releases {longDateOf(l.releasedOn)}
                    {days > 0 ? ` · ${days} ${days === 1 ? "day" : "days"} to go` : ""}
                  </span>
                  <span className="mt-1 block font-display text-xl font-extrabold text-white">{l.code} pre-orders</span>
                  <span className="block text-sm text-slate-400">{l.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card-surface mt-6 p-6">
          <h2 className="font-bold text-white">No set is taking pre-orders right now</h2>
          <p className="mt-2 text-sm text-slate-400">
            The next one appears here as soon as TCGplayer lists it. Until then, see the <Link href="/release-dates" className="text-brand-300 hover:underline">release dates</Link> or <Link href="/sealed" className="text-brand-300 hover:underline">live sealed prices</Link>.
          </p>
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/release-dates" className="btn-ghost">Release dates</Link>
        <Link href="/sealed" className="btn-ghost">All sealed prices</Link>
      </div>
    </div>
  );
}
