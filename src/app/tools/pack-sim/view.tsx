import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { faqLd } from "@/lib/jsonld";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { HubFaq } from "@/components/HubFaq";
import { PackSim } from "@/components/PackSim";
import { BOXES_PER_CASE, CARDS_PER_PACK, PACK_SLOTS, PULL_RATES } from "@/lib/pack-composition";
import type { SimSet, SimSetData } from "./load";

// The page around the simulator, shared by /tools/pack-sim (the newest set) and
// /tools/pack-sim/<set>. A simulator is a client-side toy and a crawler sees an
// empty grid, so the H1, the pack structure and the rates table are server HTML:
// that is the half that ranks and gets linked.

export const packSimTitle = (set: { code: string }) => `${set.code} Pack Opening Simulator: One Piece TCG`;
export const packSimDescription = (set: { code: string; name: string }) =>
  `Open free virtual ${set.code} ${set.name} booster packs, or a whole box, with real cards and live market prices on every pull. One Piece Card Game pack simulator.`;

function faqs(set: SimSetData) {
  return [
    {
      q: `How many cards are in a ${set.code} booster pack?`,
      a: `${CARDS_PER_PACK}. Seven commons, three uncommons, one Rare or better and one more card that is usually a common but can be a Leader, a Parallel or a chase print. A booster box is ${set.packs} packs.`,
    },
    {
      q: "Are these the real One Piece pull rates?",
      a: "Bandai publishes no pull rates for the English game, so nobody has the real ones. The simulator uses community estimates from box and case openings, the same ones as our Box EV calculator, and takes the lower figure wherever the sources disagree. The table on this page lists every rate.",
    },
    {
      q: "Are the prices on the cards real?",
      a: "Yes. Each card shows its TCGplayer US market price, converted into your currency. A card with no market price counts as bulk and adds nothing to the total, the same rule the Box EV calculator uses.",
    },
    {
      q: "Does the simulator cost anything?",
      a: "No. It is free, needs no account and has no limit. Nothing is bought or sold, and you cannot keep what you pull.",
    },
    {
      q: `Is a ${set.code} booster box worth opening?`,
      a: "Usually not, if you want specific cards: on average a box pulls less than it costs, and most boxes land under the average. Open a virtual box here to feel the spread, run the Box EV calculator for the average, and compare singles prices before you buy.",
    },
  ];
}

export function PackSimView({ sets, set, path }: { sets: SimSet[]; set: SimSetData; path: string }) {
  const qa = faqs(set);
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${set.code} ${set.name} Pack Opening Simulator`,
    url: `${SITE_URL}${path}`,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: packSimDescription(set),
  };
  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd data={[appLd, faqLd(qa)]} />
      <Breadcrumbs trail={[{ name: "Tools", href: "/tools" }, { name: "Pack Simulator", href: "/tools/pack-sim" }, ...(path !== "/tools/pack-sim" ? [{ name: set.code, href: path }] : [])]} />

      <div className="mx-auto mb-6 max-w-2xl text-center">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
          {path === "/tools/pack-sim" ? "One Piece Pack Opening Simulator" : `${set.code} ${set.name} Pack Opening Simulator`}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Open free virtual One Piece Card Game booster packs, or a whole {set.packs}-pack box. Every pack is dealt from the
          real {set.code} card list, and every card carries its live market price, so the total is what that pack would
          really be worth.
          {path === "/tools/pack-sim" && (
            <>
              {" "}Starts on <strong className="text-slate-200">{set.code} {set.name}</strong>, the newest set; pick any other below.
            </>
          )}
        </p>
      </div>

      <PackSim sets={sets} set={set} />

      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        <section>
          <h2 className="text-xl font-extrabold text-white">What is in a One Piece booster pack</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Slot</th>
                  <th className="pb-2 pr-3 font-semibold">Per pack</th>
                  <th className="pb-2 font-semibold">What comes out of it</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {PACK_SLOTS.map((s) => (
                  <tr key={s.key}>
                    <td className="py-2 pr-3 font-semibold text-white">{s.label}</td>
                    <td className="num py-2 pr-3 text-slate-300">{s.count}</td>
                    <td className="py-2 text-slate-400">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-white">One Piece pull rates (community estimates)</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Bandai publishes none, so these are what box and case openers report, set at the low end. A box is {set.packs}{" "}
            packs and a case is {BOXES_PER_CASE} boxes. The simulator and the{" "}
            <Link href="/tools/box-ev" className="text-brand-400 hover:underline">Box EV calculator</Link> use the same rates.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Card</th>
                  <th className="pb-2 pr-3 font-semibold">How often</th>
                  <th className="pb-2 font-semibold">What the sources say</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {PULL_RATES.map((r) => (
                  <tr key={r.key}>
                    <td className="py-2 pr-3 font-semibold text-white">{r.label}</td>
                    <td className="num whitespace-nowrap py-2 pr-3 text-slate-300">{r.frequency}</td>
                    <td className="py-2 text-slate-400">{r.range}. {r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-white">Should you open real packs?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Open a few virtual boxes and the answer usually arrives on its own: most packs are bulk, and a box is carried by
            one or two hits. If you want a particular card, buying the single is almost always cheaper.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
            <li><Link href="/tools/box-ev" className="font-semibold text-brand-300 hover:underline">Box EV calculator →</Link> the average value of a box against its price.</li>
            <li><Link href="/sealed" className="font-semibold text-brand-300 hover:underline">Sealed prices →</Link> what a real box costs at every store we track.</li>
            <li><Link href={`/sets/${set.slug}`} className="font-semibold text-brand-300 hover:underline">Every {set.code} card, priced →</Link> if you would rather buy the card you wanted.</li>
          </ul>
        </section>

        {sets.length > 1 && (
          <section>
            <h2 className="text-xl font-extrabold text-white">Open packs from another set</h2>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {sets.map((s) => (
                <li key={s.slug}>
                  <Link href={`/tools/pack-sim/${s.slug}`} className="inline-block rounded-md border border-ink-700 px-2.5 py-1 text-slate-300 hover:border-brand-500/60 hover:text-white">
                    {s.code} pack simulator
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <HubFaq faqs={qa} />
      </div>
    </div>
  );
}

export function PackSimUnavailable() {
  return (
    <div className="card-surface mx-auto grid max-w-3xl place-items-center p-16 text-center text-slate-400">
      <div>
        <p className="text-base font-semibold text-white">The pack simulator is warming up</p>
        <p className="mt-1 text-sm">
          It deals from the card list our import publishes. Check back shortly, or{" "}
          <Link href="/sealed" className="text-brand-400 hover:underline">compare booster box prices</Link> meanwhile.
        </p>
      </div>
    </div>
  );
}
