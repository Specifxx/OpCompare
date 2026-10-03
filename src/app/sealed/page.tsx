import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { SealedTile } from "@/components/SealedTile";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { SEALED_KINDS } from "@/lib/constants";
import { COUNTRIES } from "@/lib/country";
import { getCatalog, getSealedCatalog, type SealedLite } from "@/lib/data";
import { int } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { sortPrice } from "@/lib/price";
import { newestBoosterSet } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "One Piece Sealed Products — Booster Box & Deck Prices",
  description: "One Piece Card Game booster boxes, cases, packs, starter decks, double packs and collections, priced across the stores we track in six markets.",
  alternates: { canonical: "/sealed" },
};

const RETAIL = ["Booster Box", "Booster Case", "Booster Pack", "Sleeved Booster Pack", "Double Pack Set", "Starter Deck", "Display", "Display Case", "Premium Collection", "Gift Collection", "Illustration Box", "Tin Pack Set", "Devil Fruits Collection", "DON!! Pack", "Collection"];
const SORT = { featured: "Featured", "price-asc": "Price: low to high", "price-desc": "Price: high to low", newest: "Newest first", name: "Name A–Z" } as const;

type SP = { kind?: string | string[]; set?: string; stock?: string; sort?: string; promo?: string };
const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export default async function SealedPage({ searchParams }: { searchParams: SP }) {
  const country = getCountry();
  const c = COUNTRIES[country];
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const kinds = arr(searchParams.kind);
  const sort = (searchParams.sort ?? "featured") as keyof typeof SORT;
  const set = searchParams.set ? cat.setBySlug.get(searchParams.set) : undefined;
  const promo = searchParams.promo === "1";
  let rows: SealedLite[] = sealed.filter((s) => (promo || kinds.includes("Promo Pack") ? true : s.kind !== "Promo Pack"));
  if (kinds.length) rows = rows.filter((s) => kinds.includes(s.kind));
  if (set) rows = rows.filter((s) => s.setId === set.id);
  if (searchParams.stock === "1") rows = rows.filter((s) => s.low[country] != null);
  const rel = (s: SealedLite) => s.releasedOn ?? (s.setId ? cat.setById.get(s.setId)?.releasedOn ?? "" : "");
  const rank = (k: string) => (RETAIL.indexOf(k) === -1 ? 99 : RETAIL.indexOf(k));
  rows.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return (sortPrice(a, country) ?? Infinity) - (sortPrice(b, country) ?? Infinity);
      case "price-desc":
        return (sortPrice(b, country) ?? -1) - (sortPrice(a, country) ?? -1);
      case "newest":
        return rel(b).localeCompare(rel(a));
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return rank(a.kind) - rank(b.kind) || rel(b).localeCompare(rel(a));
    }
  });
  const newest = newestBoosterSet(cat.sets);
  const setOptions = cat.sets
    .filter((s) => s.sealedCount > 0)
    .sort((a, b) => (b.releasedOn ?? "").localeCompare(a.releasedOn ?? ""));

  return (
    <div className="container-app py-6">
      <Breadcrumbs items={[{ label: "Sealed" }]} />
      <div className="card-surface border-brand-500/40 p-6 sm:p-8">
        <h1 className="text-3xl text-white sm:text-4xl">Sealed Products</h1>
        <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
          <p>
            Booster boxes, cases, packs, starter decks, double packs and collections, priced across the stores we track in your market. A tile&apos;s price is
            the cheapest offer you can order now in {c.place} — the item price, with postage at the store&apos;s checkout — and its store count is how many
            have it in stock. Tap a tile for every offer, cheapest first.
          </p>
          <p>
            “≈” marks TCGplayer&apos;s market price converted to {c.currency} where no {c.adjective} store lists the product. Per-pack prices appear only where
            the pack count is certain. After particular cards? Singles are usually cheaper than opening product for them — the{" "}
            <Link href="/tools/box-value" className="link">box value calculator</Link> weighs a box against its cards.
          </p>
        </div>
      </div>

      {newest ? (
        <div className="card-surface mt-4 flex flex-wrap items-center gap-3 border-brand-500/40 p-4">
          <span className="rounded bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-400">Newest set</span>
          <p className="flex-1 text-[15px] text-slate-200">
            <span className="font-semibold text-white">{newest.name} sealed</span> — product from the newest released set, priced across stores.
          </p>
          <Link href={`/sealed?set=${newest.slug}`} className="btn-primary min-h-10">
            Shop {newest.code} →
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <form id="sf" action="/sealed" method="get" className="card-surface h-fit p-4">
          <p className="mb-3 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-white">Filters</p>
          <label className="flex items-center gap-2.5 text-[15px] text-slate-200">
            <input type="checkbox" name="stock" value="1" defaultChecked={searchParams.stock === "1"} className="h-4 w-4 accent-[#d92b33]" />
            In stock in {c.code} only
          </label>
          <label className="mt-2 flex items-center gap-2.5 text-[15px] text-slate-200">
            <input type="checkbox" name="promo" value="1" defaultChecked={promo} className="h-4 w-4 accent-[#d92b33]" />
            Include tournament promo packs
          </label>
          <div className="mt-4 border-t border-ink-800 pt-3">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-300">Product type</p>
            <div className="space-y-1.5">
              {SEALED_KINDS.filter((k) => sealed.some((s) => s.kind === k)).map((k) => (
                <label key={k} className="flex items-center gap-2.5 text-[15px] text-slate-200">
                  <input type="checkbox" name="kind" value={k} defaultChecked={kinds.includes(k)} className="h-4 w-4 accent-[#d92b33]" />
                  {k}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-ink-800 pt-3">
            <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-slate-300" htmlFor="sf-set">
              Set
            </label>
            <select id="sf-set" name="set" defaultValue={set?.slug ?? ""} className="input">
              <option value="">Every set</option>
              {setOptions.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary mt-4 w-full">
            Apply filters
          </button>
        </form>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="num font-semibold text-white">{int(rows.length)}</span> products
            </p>
            <AutoSubmitSelect form="sf" name="sort" value={sort} label="Sort" options={Object.entries(SORT) as [string, string][]} />
          </div>
          {rows.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {rows.slice(0, 120).map((s) => (
                <SealedTile key={s.id} s={s} country={country} setCode={s.setId ? cat.setById.get(s.setId)?.code : null} />
              ))}
            </div>
          ) : (
            <EmptyState title="No sealed products match">
              <Link href="/sealed" className="link">Clear filters</Link>
            </EmptyState>
          )}
          {rows.length > 120 ? <p className="mt-4 text-sm text-slate-400">Showing 120 of {rows.length} — narrow by set or type to see the rest.</p> : null}
        </div>
      </div>
    </div>
  );
}
