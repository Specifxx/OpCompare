import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { getCardText } from "@/lib/data";
import { int } from "@/lib/format";
import { itemListLd } from "@/lib/jsonld";
import { pageOg } from "@/lib/og/meta";
import { traitHubs } from "@/lib/traits";

// /cards/trait — every card type with its own page (lib/traits.ts).
export const metadata: Metadata = {
  title: "One Piece Card Types — Straw Hat Crew, Navy, Whitebeard Pirates & More",
  description: "Every One Piece Card Game type (crew and faction) with enough cards for its own price list: Straw Hat Crew, Navy, Supernovas, Land of Wano and more.",
  alternates: { canonical: "/cards/trait" },
  openGraph: pageOg("/cards/trait"),
};

export default async function TraitsHub() {
  const hubs = traitHubs(await getCardText());
  return (
    <div>
      <JsonLd data={itemListLd("One Piece Card Game types", "/cards/trait", hubs.map((h) => ({ name: h.name, path: `/cards/trait/${h.slug}` })))} />
      <Breadcrumbs trail={[{ href: "/cards", name: "Cards" }, { name: "Types" }]} />
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">One Piece card types</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        A card&apos;s type is the crew, faction or place printed under its name, such as Straw Hat Crew or Navy. Many Leaders and decks are built around one.
        These {hubs.length} types have enough cards for their own price list; counts are card numbers.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map((h) => (
          <Link key={h.slug} href={`/cards/trait/${h.slug}`} className="card-surface p-4 hover:border-ink-600">
            <p className="font-bold text-white">{h.name}</p>
            <p className="num mt-1 text-xs text-slate-500">{int(h.numbers.size)} cards</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
