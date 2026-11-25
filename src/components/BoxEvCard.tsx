"use client";

// "Is this box worth it?" (Job A follow-ups, 2026-11-26): a small card on a Booster Box or Booster Case page with the
// expected value of opening one box of the set at TCGplayer's US market prices and the calculator's default pull
// rates (lib/box-ev.ts boxEvOfSet), beside the cheapest in-stock store box on this page in the visitor's market, and
// ONE link to /tools/box-ev. The page computes and formats everything on the server; this island only counts the
// click. It is not drawn when a set is too thinly priced, so no number is invented. Not an ad and not a prompt.
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export function BoxEvCard({
  setCode,
  setName,
  evText,
  priceText,
  ratio,
  chaseHeavy,
  isCase,
  converted,
}: {
  setCode: string;
  setName: string;
  evText: string;
  priceText: string | null;
  ratio: number | null;
  chaseHeavy: boolean;
  isCase: boolean;
  converted: boolean;
}) {
  const verdict =
    ratio == null
      ? null
      : ratio >= 1
        ? { tone: "text-emerald-300", text: "On average, the cards inside are worth about what this box costs, or more." }
        : ratio >= 0.85
          ? { tone: "text-amber-300", text: "Roughly break-even: open it for the fun of it, not to make money." }
          : { tone: "text-slate-300", text: "The box costs more than its cards' average value, so if you want particular cards, buying them as singles is cheaper." };
  return (
    <section aria-labelledby="box-ev-card" className="mt-4 rounded-xl border border-ink-800 bg-ink-900 p-4 sm:p-5" data-box-ev-card={setCode}>
      <h2 id="box-ev-card" className="text-base font-bold text-white">
        Is this box worth it?
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {isCase ? "Each booster box in this case opens" : "Opened, an average box opens"} to about{" "}
        <span className="font-semibold tabular-nums text-white">{evText}</span> in {setName} singles
        {priceText && (
          <>
            , against <span className="font-semibold tabular-nums text-white">{priceText}</span> for the cheapest store box on this page
            {ratio != null && <> ({Math.round(ratio * 100)}% of the price)</>}
          </>
        )}
        .
      </p>
      {verdict && <p className={`mt-1 text-sm leading-6 ${verdict.tone}`}>{verdict.text}</p>}
      {chaseHeavy && (
        <p className="mt-1 text-sm leading-6 text-slate-400">Almost all of that average is a handful of chase cards, so a typical box lands well below it.</p>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Expected value at TCGplayer&rsquo;s US market prices{converted ? ", converted from US dollars at an approximate rate" : ""}. One Piece pull rates
        are community estimates, set low on purpose. It is an average over many boxes, not what one box will hold.
      </p>
      <Link
        href={`/tools/box-ev?set=${encodeURIComponent(setCode)}`}
        prefetch={false}
        onClick={() => trackEvent("box_ev_card", { set: setCode, case: isCase, ratio: ratio == null ? undefined : Math.round(ratio * 100) })}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-400 underline underline-offset-2 hover:text-white"
      >
        Work it out in the box value calculator →
      </Link>
    </section>
  );
}
