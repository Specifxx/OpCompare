import type { Country } from "@/lib/country";
import { money } from "@/lib/format";
import { lastKnownAmount, lastKnownLabel, lastKnownTitle, type LastKnown } from "@/lib/last-known";

// A last known price (lib/last-known.ts) where a tile, a row or the card page
// would say "No price yet" / "—". It must never read as a live price: the
// amount is in the secondary text colour (never the price accent), the fine
// print says "Last known price · <date>" in words, and it is plain text (no
// link, no buy button, no "from"/"cheapest"). No hooks: renders on the server
// (the price guide, the card links) and inside the client tiles and islands.
export function LastKnownPrice({
  lk,
  country,
  amountClass = "text-base font-semibold sm:text-lg",
  noteClass = "text-[11px]",
  noteFirst = false,
}: {
  lk: LastKnown;
  country: Country;
  /** Size and weight of the amount; its colour is always the muted one. */
  amountClass?: string;
  noteClass?: string;
  /** The tiles put their label above the amount ("from", "TCGplayer market"); so does this, there. */
  noteFirst?: boolean;
}) {
  const note = <span className={`block font-normal leading-snug text-slate-500 ${noteClass}`}>{lastKnownLabel(lk)}</span>;
  return (
    <span className="block" data-last-known={lk.kind} title={lastKnownTitle(lk, country)}>
      {noteFirst ? note : null}
      <span className={`num block truncate leading-tight text-slate-400 ${amountClass}`}>{lastKnownAmount(lk, (c) => money(c, country))}</span>
      {noteFirst ? null : note}
    </span>
  );
}
