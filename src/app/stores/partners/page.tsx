import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { STORES } from "@/lib/stores";
import { CONTACT_EMAIL } from "@/lib/site";
import { pageOg } from "@/lib/og/meta";
import { CODE_RECHECK_DAYS } from "@/lib/store-partner-deals";

// The store partner program (DECISIONS.md, "Store partner codes", 2026-10-26).
// Static copy, no data read.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Store Partners: Pay Only When OP Compare Sends You a Sale",
  description:
    "One Piece card stores: give OP Compare shoppers an exclusive discount code and pay a commission only on the orders we send. No fee, and it never changes your place in any comparison.",
  alternates: { canonical: "/stores/partners" },
  openGraph: pageOg("/stores/partners"),
};

const STEPS = [
  {
    title: "Make a code just for our shoppers",
    body: "Create a discount code that you give only to OP Compare, for example OPC5 for 5% off singles. Your discount report then counts every order we sent, including the ones on phones, where tracking links often get lost.",
  },
  {
    title: "Optionally, add a commission link",
    body: "If you run an affiliate app such as Shopify Collabs, UpPromote, GoAffPro or Refersion, send us the referral parameter. We add it to every link to your store, and you pay the commission you set only when someone buys. No app? The code alone works, and we agree a percentage of the orders it shows.",
  },
  {
    title: "We show it beside your prices",
    body: "Your code appears as a chip on every one of your rows, on card and sealed pages and quick views, and on your store page. Shoppers tap it to copy.",
  },
];

export default function StorePartnersPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs trail={[{ href: "/stores", name: "Stores we track" }, { name: "Store partners" }]} />
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Store partners: pay only when we send you a sale</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
        OP Compare compares One Piece Card Game prices across {STORES.length} stores and sends shoppers to the one they pick. Give those
        shoppers an exclusive code, and pay a commission only on the orders it brings you. No fee, no contract.
      </p>
      <p className="card-surface mt-5 p-4 text-sm leading-relaxed text-slate-300">
        <strong className="text-white">A partnership never changes your place in any comparison.</strong> Rows are sorted by item price,
        the same for every store, and the price we show is yours before the code. The code is a label beside it. A cheaper store that is
        not a partner still ranks above you.
      </p>

      <h2 className="mt-8 text-lg font-extrabold text-white">How it works</h2>
      <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card-surface p-4">
            <div className="text-xs font-bold text-slate-500">Step {i + 1}</div>
            <h3 className="mt-1 text-sm font-bold text-white">{s.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-400">
        <h2 className="font-bold text-white">See what we already send you</h2>
        <p>
          Every link from OP Compare to your store carries <code className="rounded bg-ink-800 px-1 text-xs">utm_source=opcompare</code>.
          Filter your analytics by that source to see the visitors and orders we sent before you decide. Your page under{" "}
          <Link href="/stores" className="text-brand-400 hover:underline">Stores we track</Link> shows how many cards you are the
          cheapest for.
        </p>
        <h2 className="font-bold text-white">Codes that always work</h2>
        <p>
          Ours come from you, and we re-check each one at your checkout at least every {CODE_RECHECK_DAYS} days. A code that
          hasn&apos;t been checked in that time disappears from the site on its own until it is.
        </p>
      </div>

      <section id="join" className="card-surface mt-6 p-6 text-center">
        <h2 className="font-bold text-white">Join</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
          Email us from your store&apos;s address with your code, what it gives, any end date, and your affiliate app&apos;s referral link
          if you have one. We test the code at your checkout and it goes live with the next update.
        </p>
        <p className="mt-4 select-all font-mono text-sm text-white">{CONTACT_EMAIL}</p>
        <p className="mt-4 text-xs text-slate-500">
          Not compared yet? <Link href="/stores/suggest" className="text-brand-400 hover:underline">Suggest your store</Link> first.
        </p>
      </section>
    </div>
  );
}
