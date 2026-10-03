import Link from "next/link";
import type { Country } from "@/lib/country";
import type { CardLite, SetLite } from "@/lib/data";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { headline } from "@/lib/price";

export interface DealRow {
  card: CardLite;
  badge: React.ReactNode;
  note?: string;
}

// One column of the homepage "Today's top deals" board (RiftCompare's DealsRow).
export function DealList({ title, sub, rows, country, setById, empty }: { title: string; sub: string; rows: DealRow[]; country: Country; setById: Map<number, SetLite>; empty: string }) {
  return (
    <div className="card-surface flex min-w-0 flex-col">
      <div className="border-b border-ink-800 px-4 py-3">
        <h3 className="text-base text-white">{title}</h3>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      {rows.length ? (
        <ul className="divide-y divide-ink-800">
          {rows.map(({ card, badge, note }) => {
            const h = headline(card, country);
            const set = setById.get(card.setId);
            return (
              <li key={card.id}>
                <Link href={`/card/${card.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800/50">
                  {card.hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cardImage.thumb(card.id)} alt="" loading="lazy" className="h-12 w-9 shrink-0 rounded-sm bg-ink-800 object-cover" />
                  ) : (
                    <span className="h-12 w-9 shrink-0 rounded-sm bg-ink-800" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-slate-100">
                      {card.name}
                      {card.variant ? <span className="text-xs font-normal text-slate-400"> ({card.variant})</span> : null}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {set?.code} · {card.number ?? "DON!!"}
                      {note ? ` · ${note}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="num text-sm font-semibold text-accent">
                      {h.cents == null ? "—" : `${h.kind === "reference" ? "≈" : ""}${money(h.cents, country)}`}
                    </span>
                    {badge}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}
