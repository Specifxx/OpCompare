import type { Metadata } from "next";
import Link from "next/link";
import { SuggestStoreForm } from "@/components/SuggestStoreForm";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = {
  title: "Suggest a One Piece Card Store",
  description: "Tell OP Compare about a One Piece Card Game store to compare: Shopify stores selling English singles with card numbers in their titles.",
  alternates: { canonical: "/stores/suggest" },
};

export default function SuggestStorePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ href: "/stores", label: "Stores we track" }, { label: "Suggest a store" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">Suggest a store</h1>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>We can add a store when it meets all of these:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>It runs on Shopify (its product pages are public and readable).</li>
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
