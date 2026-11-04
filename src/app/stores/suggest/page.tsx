import type { Metadata } from "next";
import Link from "next/link";
import { SuggestStoreForm } from "@/components/SuggestStoreForm";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = {
  title: "List your One Piece card store, free",
  description: "Run a One Piece Card Game store? Get it listed on OP Compare's price comparison for free: Shopify, ShadowPOS and other stores selling English singles with card numbers in their titles.",
  alternates: { canonical: "/stores/suggest" },
};

export default function SuggestStorePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs trail={[{ href: "/stores", name: "Stores we track" }, { name: "Suggest a store" }]} />
      <h1 className="text-2xl font-extrabold text-white">List your store on OP Compare</h1>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          Run a store? Listing is free, there is no contract and no fee, and you never pay to rank: prices are sorted by price only. Buyers comparing a card go straight to your product page, and we read your prices every day with nothing for you to maintain. We check every request within a few days and reply through the contact details on your website. Know a good store but don&apos;t run it? The same form works.
        </p>
        <p>We can add a store when it meets all of these:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Its catalogue is public and readable: Shopify and ShadowPOS stores are the easiest; Ecwid, BigCommerce and WooCommerce stores often work too.
          </li>
          <li>It sells English One Piece Card Game singles, with the card number in each title (for example &ldquo;OP01-120&rdquo;).</li>
          <li>It prices in its own market&apos;s currency: US dollars, Australian dollars, pounds, Singapore dollars, Canadian dollars or euros.</li>
        </ul>
        <p>
          Check <Link href="/stores" className="text-brand-400 hover:underline">the stores we already compare</Link> first.
        </p>
      </div>
      <div className="mt-6">
        <SuggestStoreForm />
      </div>
    </div>
  );
}
