import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { STORES } from "@/lib/stores";
import { HowWePickStores } from "@/components/HowWePickStores";
import { pageOg } from "@/lib/og/meta";

// The store-vetting page every Compare Empire site shares (owner, 2026-11-02).
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How We Pick Stores",
  description: "How OP Compare checks every One Piece Card Game store before listing it, keeps checking it every week, and how to report a store.",
  alternates: { canonical: "/how-we-pick-stores" },
  openGraph: pageOg("/how-we-pick-stores"),
};

export default function HowWePickStoresPage() {
  return (
    <div className="mx-auto max-w-3xl text-slate-300">
      <Breadcrumbs trail={[{ href: "/stores", name: "Stores we track" }, { name: "How we pick stores" }]} />
      <HowWePickStores
        site="OP Compare"
        what="One Piece cards"
        stores={STORES.map((s) => s.name)}
        priceRule="A single priced under 30% of TCGplayer's market price, or sealed product under half of it, is dropped automatically."
        marketplaces="eBay and TCGplayer rows are marketplaces, not stores: they are labelled and never counted as a store. We don't vet the individual sellers there, so check a seller's feedback before you buy."
        buttonClassName="btn-primary"
        suggestHref="/stores/suggest"
      />
    </div>
  );
}
