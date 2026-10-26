import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { faqLd } from "@/lib/jsonld";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { HubFaq } from "@/components/HubFaq";
import { PullTracker } from "@/components/PullTracker";
import type { SimSet, SimSetData } from "../pack-sim/load";

// The page around the pull tracker, shared by /tools/pull-tracker (the newest
// set) and /tools/pull-tracker/<set>. Same data as the pack simulator
// (../pack-sim/load.ts): one set's pull pools and the cheapest real box.

export const pullTrackerTitle = (set: { code: string }) => `${set.code} Pull Tracker: What Is My Box Worth? | OP Compare`;
export const pullTrackerDescription = (set: { code: string; name: string }) =>
  `Log what your ${set.code} ${set.name} booster box or packs pulled and see what the cards are worth against what you paid, at live One Piece market prices. Free, no account.`;

const FAQS = [
  {
    q: "How do I work out what my One Piece booster box pulled?",
    a: "Pick the set, tap each card you pulled (search by name or number), and type what you paid. The tracker adds up every card at its TCGplayer US market price, converted into your currency, and shows whether the box beat its price.",
  },
  {
    q: "Is my list saved?",
    a: "In this browser, per set, until you clear it. Nothing is sent to us. Share my pulls makes a link that carries the list itself, so whoever opens it sees the same pulls.",
  },
  {
    q: "Why are some cards shown as bulk?",
    a: "They have no market price yet, usually because the set is new or the card is a common nobody sells singly. They count as nothing in the total, which is close to what they fetch.",
  },
];

export function PullTrackerView({ sets, set, path }: { sets: SimSet[]; set: SimSetData; path: string }) {
  const hub = path === "/tools/pull-tracker";
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${set.code} ${set.name} Pull Tracker`,
    url: `${SITE_URL}${path}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: pullTrackerDescription(set),
  };
  return (
    <div className="mx-auto max-w-6xl">
      <JsonLd data={[appLd, faqLd(FAQS)]} />
      <Breadcrumbs trail={[{ name: "Tools", href: "/tools" }, { name: "Pull Tracker", href: "/tools/pull-tracker" }, ...(hub ? [] : [{ name: set.code, href: path }])]} />
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
          {hub ? "One Piece Pull Tracker: What Is My Box Worth?" : `${set.code} ${set.name} Pull Tracker`}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Opened a box or a few packs? Tap the cards you pulled and see what they are worth at live market prices, against
          what you paid. Free, no account, and nothing leaves your browser unless you share it.
          {hub && <> Starts on <strong className="text-slate-200">{set.code} {set.name}</strong>, the newest set.</>}
        </p>
      </div>
      <PullTracker sets={sets} set={set} />
      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        <section>
          <h2 className="text-xl font-extrabold text-white">Before your next box</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
            <li><Link href={`/tools/pack-sim/${set.slug}`} className="font-semibold text-brand-300 hover:underline">{set.code} pack simulator →</Link> open virtual boxes and see how often a box beats its price.</li>
            <li><Link href="/tools/box-ev" className="font-semibold text-brand-300 hover:underline">Box EV calculator →</Link> the average value of a box against its price.</li>
            <li><Link href="/sealed" className="font-semibold text-brand-300 hover:underline">Sealed prices →</Link> what a box costs at every store we track.</li>
          </ul>
        </section>
        <HubFaq faqs={FAQS} />
      </div>
    </div>
  );
}
