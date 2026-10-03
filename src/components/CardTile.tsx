import Link from "next/link";
import type { Country } from "@/lib/country";
import type { CardLite } from "@/lib/data";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { headline } from "@/lib/price";
import { PRINTINGS } from "@/lib/constants";
import { WatchButton } from "./WatchButton";

export function CardArt({ id, hasImage, alt, size = "tile", className = "" }: { id: number; hasImage: boolean; alt: string; size?: "thumb" | "tile" | "large"; className?: string }) {
  if (!hasImage) {
    return (
      <div className={`grid aspect-[300/419] place-items-center rounded-md bg-ink-800 text-xs text-slate-500 ${className}`}>
        No image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cardImage[size](id)}
      alt={alt}
      loading={size === "large" ? "eager" : "lazy"}
      decoding="async"
      width={300}
      height={419}
      className={`aspect-[300/419] w-full rounded-md bg-ink-800 object-cover ${className}`}
    />
  );
}

export function PriceLine({ card, country }: { card: Pick<CardLite, "low" | "stores" | "marketUsd">; country: Country }) {
  const h = headline(card, country);
  if (h.kind === "listing") {
    return (
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-slate-500">from</p>
          <p className="num text-lg font-bold text-accent">{money(h.cents, country)}</p>
        </div>
        {/* Real stores only: a TCGplayer or eBay low has no store to count. */}
        {h.stores > 0 ? (
          <p className="pb-1 text-[11px] font-semibold text-emerald-400">
            {h.stores} {h.stores === 1 ? "store" : "stores"}
          </p>
        ) : null}
      </div>
    );
  }
  if (h.kind === "reference") {
    return (
      <div>
        <p className="text-[11px] text-slate-500">TCGplayer market</p>
        <p className="num text-lg font-semibold text-slate-300">≈ {money(h.cents, country)}</p>
      </div>
    );
  }
  return <p className="pt-3 text-sm text-slate-500">No price yet</p>;
}

export function CardTile({ card, setCode, country, priority = false }: { card: CardLite; setCode: string; country: Country; priority?: boolean }) {
  const p = PRINTINGS[card.printing];
  const ribbon = card.printing !== "standard" && card.printing !== "don" ? (card.variant?.split(" · ")[0] ?? p?.label) : null;
  return (
    <Link href={`/card/${card.slug}`} className="group card-surface flex flex-col overflow-hidden hover:border-ink-600">
      <div className="relative bg-ink-850 p-3">
        {ribbon ? (
          <span className="absolute left-2 top-2 z-[1] max-w-[75%] truncate rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1a1203]" style={{ background: p?.dot ?? "#e9c22a" }}>
            ★ {ribbon}
          </span>
        ) : null}
        <span className="absolute right-2 top-2 z-[1]">
          <WatchButton slug={card.slug} kind="card" name={card.name} />
        </span>
        <CardArt id={card.id} hasImage={card.hasImage} alt={`${card.name}${card.variant ? ` (${card.variant})` : ""} ${card.number ?? ""} One Piece card`} className={priority ? "" : ""} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-display text-[15px] font-extrabold leading-snug text-white group-hover:text-brand-400">
          {card.name}
          {card.variant && card.printing === "don" ? <span className="font-sans text-xs font-medium text-slate-400"> · {card.variant}</span> : null}
        </h3>
        <p className="text-xs text-slate-400">
          {setCode}
          {card.number ? ` · ${card.number}` : ""}
        </p>
        <div className="mt-auto pt-2">
          <PriceLine card={card} country={country} />
        </div>
      </div>
    </Link>
  );
}
