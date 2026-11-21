import { affiliateUrl, outboundRel } from "@/lib/affiliate";

// The Black Friday and Cyber Monday pages' TCGplayer block (DECISIONS.md, "Black Friday strip on sealed pages", 2026-11-21
// amendment): one "Ad"-labelled card of tagged TCGplayer searches for One Piece sealed, under the deals and the price watch,
// never above a price. It claims no price and no discount, ranks nothing, and is never a store or the cheapest: TCGplayer's
// sellers set their own prices, so the visitor checks them against the store prices above. Clicks: data-surface "bf_page".
const BASE = "https://www.tcgplayer.com/search/one-piece-card-game/product?productLineName=one-piece-card-game&ProductTypeName=Sealed+Products";
const SEARCHES: { label: string; q: string }[] = [
  { label: "Booster boxes", q: "booster box" },
  { label: "Starter decks", q: "starter deck" },
  { label: "All sealed One Piece", q: "" },
];

export function TcgplayerSaleBlock({ name, page }: { name: string; page: string }) {
  return (
    <section aria-labelledby="tcgplayer-sale" data-tcgplayer-sale="" className="card-surface flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="rounded border border-ink-700 px-1.5 text-[11px] font-semibold uppercase leading-5 text-slate-400">Ad</span>
        <h2 id="tcgplayer-sale" className="font-bold text-white">
          {name} on TCGplayer
        </h2>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
        TCGplayer&rsquo;s sellers set their own prices, so we don&rsquo;t count them as a store or rank them here. Check what you find against the store
        prices above. Paid links: we may earn a commission, at no cost to you.
      </p>
      <ul className="flex flex-wrap gap-2 text-sm">
        {SEARCHES.map((s) => (
          <li key={s.label}>
            <a
              href={affiliateUrl(s.q ? `${BASE}&q=${encodeURIComponent(s.q)}` : BASE, "tcgplayer", `/${page}`)}
              target="_blank"
              rel={outboundRel()}
              data-retailer="tcgplayer"
              data-page={page}
              data-surface="bf_page"
              className="inline-block rounded-lg border border-ink-700 px-3 py-1.5 font-semibold text-white hover:border-slate-400"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
