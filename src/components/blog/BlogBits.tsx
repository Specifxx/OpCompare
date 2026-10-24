import CardQuickLink from "../CardQuickLink";
import { CardImage } from "../CardImage";
import { LastKnownPrice } from "../LastKnownPrice";
import { lastKnownFor } from "@/lib/last-known";
import { PrintingBadge, rarityColor } from "../Badge";
import type { Country } from "@/lib/country";
import type { CardLite, SetLite } from "@/lib/data";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { headline } from "@/lib/price";
import { DATA_TABLE } from "@/components/prose";

// Building blocks the posts share.

export function CardTable({ cards, setById, country, showMarket = true, caption }: { cards: CardLite[]; setById: Map<number, SetLite>; country: Country; showMarket?: boolean; caption?: string }) {
  return (
    <div className="not-prose my-5 overflow-x-auto rounded-lg border border-ink-800">
      <table className={`${DATA_TABLE} min-w-[560px]`}>
        {caption ? <caption className="px-3 pt-3 text-left text-xs text-slate-400">{caption}</caption> : null}
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Card</th>
            <th>Set · No.</th>
            {showMarket ? <th className="text-right">TCGplayer market</th> : null}
            <th className="text-right">Cheapest here</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c, i) => {
            const h = headline(c, country);
            return (
              <tr key={c.id}>
                <td className="num text-slate-500">{i + 1}</td>
                <td>
                  <CardQuickLink slug={c.slug} className="group flex items-center gap-3">
                    {c.hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cardImage.thumb(c.id)} alt="" loading="lazy" className="h-12 w-9 shrink-0 rounded-sm bg-ink-800 object-cover" />
                    ) : (
                      <span aria-hidden className="h-12 w-9 shrink-0 rounded-sm border border-dashed border-ink-700 bg-ink-800" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-100 group-hover:text-brand-400 group-hover:underline">{c.name}</span>
                      {c.variant ? <span className="block text-xs text-slate-500">{c.variant}</span> : null}
                    </span>
                  </CardQuickLink>
                </td>
                <td className="num whitespace-nowrap text-xs text-slate-400">
                  {setById.get(c.setId)?.code} · {c.number ?? "DON!!"}
                </td>
                {showMarket ? <td className="num whitespace-nowrap text-right font-semibold text-accent">{money(c.marketUsd, "US")}</td> : null}
                <td className="num whitespace-nowrap text-right text-slate-300">
                  {h.kind === "listing" ? money(h.cents, country) : h.kind === "reference" ? <span className="text-slate-500">≈ {money(h.cents, country)}</span> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The cards a post is about as tiles (RiftCompare's in-post card grids): the
 * CardTile look (art on the rarity tint, printing chip, name, SET · number)
 * and the tile's price block in plain spans (the article prose styles every
 * p, h3 and a inside it), so it renders with the post on the server
 * (no CountryProvider needed) and prices are in the reader's market. A printing TCGplayer
 * has no image for yet shows CardImage's placeholder, never another picture.
 */
export function CardGrid({ cards, setById, country, caption }: { cards: CardLite[]; setById: Map<number, SetLite>; country: Country; caption?: string }) {
  if (!cards.length) return null;
  return (
    <div className="not-prose my-5">
      {caption ? <p className="mb-2 text-xs text-slate-400">{caption}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const label = `${c.name}${c.variant ? ` (${c.variant})` : ""}`;
          return (
            <CardQuickLink key={c.id} slug={c.slug} className="group card-surface flex flex-col overflow-hidden !no-underline transition-[transform,box-shadow,border-color] motion-safe:hover:-translate-y-0.5 hover:border-ink-600 hover:shadow-glow">
              <div className="relative aspect-[5/7] w-full overflow-hidden p-1.5 sm:p-3" style={{ backgroundColor: `${rarityColor(c.rarity)}14` }}>
                <CardImage id={c.id} hasImage={c.hasImage} alt={`${label} ${c.number ?? ""} One Piece card`.trim()} className="h-full w-full" />
                <div className="absolute left-2 right-2 top-2 z-20 flex flex-col items-start gap-1 [&>*]:max-w-full [&>*]:truncate">
                  <PrintingBadge printing={c.printing} variant={c.variant} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 border-t border-ink-700 p-3">
                <span data-card-name className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-brand-400">{c.name}</span>
                <span className="text-xs text-slate-500">
                  {setById.get(c.setId)?.code ?? ""}
                  {c.number ? ` · ${c.number}` : ""}
                </span>
                <span className="mt-auto block pt-1">
                  <TilePrice c={c} country={country} />
                </span>
              </div>
            </CardQuickLink>
          );
        })}
      </div>
    </div>
  );
}

function TilePrice({ c, country }: { c: CardLite; country: Country }) {
  const h = headline(c, country);
  if (h.kind === "listing")
    return (
      <span className="flex items-end justify-between gap-2">
        <span className="block">
          <span className="block text-[11px] text-slate-500">from</span>
          <span className="num block text-base font-bold leading-tight text-accent sm:text-lg">{money(h.cents, country)}</span>
        </span>
        {h.stores > 0 ? <span className="pb-0.5 text-[11px] font-semibold text-brand-400">{h.stores} {h.stores === 1 ? "store" : "stores"}</span> : null}
      </span>
    );
  if (h.kind === "reference")
    return (
      <span className="block">
        <span className="block text-[11px] text-slate-500">TCGplayer market</span>
        <span className="num block text-base font-semibold leading-tight text-slate-300 sm:text-lg">≈ {money(h.cents, country)}</span>
      </span>
    );
  // Where it would say "No price yet": the last known price, muted and dated (display only).
  const lk = lastKnownFor(c, country);
  if (lk) return <LastKnownPrice lk={lk} country={country} noteFirst />;
  return <span className="block text-sm text-slate-500">No price yet</span>;
}

export function SimpleTable({ head, rows, align }: { head: string[]; rows: React.ReactNode[][]; align?: ("l" | "r")[] }) {
  return (
    <div className="not-prose my-5 overflow-x-auto rounded-lg border border-ink-800">
      <table className={`${DATA_TABLE} min-w-[520px]`}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} className={align?.[i] === "r" ? "text-right" : ""}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={align?.[j] === "r" ? "num whitespace-nowrap text-right" : ""}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-lg border border-gold/30 bg-gold/[0.05] p-4">
      <p className="rb-eyebrow text-slate-500 mb-1">{title}</p>
      <div className="text-[15px] leading-relaxed text-slate-200">{children}</div>
    </div>
  );
}

export function CardLink({ c }: { c: CardLite }) {
  return (
    <CardQuickLink slug={c.slug}>
      {c.name}
      {c.variant ? ` (${c.variant})` : ""}
    </CardQuickLink>
  );
}

export const pct0 = (v: number) => `${Math.round(v)}%`;
