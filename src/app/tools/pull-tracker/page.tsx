import type { Metadata } from "next";
import { pageOg } from "@/lib/og/meta";
import { simSetData, simSets } from "../pack-sim/load";
import { PackSimUnavailable } from "../pack-sim/view";
import { PullTrackerView } from "./view";

// /tools/pull-tracker — the pull tracker on the newest released set. Real ISR,
// as /tools/pack-sim: nothing here reads the visitor; pulls live in the browser.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "One Piece Pull Tracker: What Is My Booster Box Worth? | OP Compare" },
  description:
    "Log the cards your One Piece booster box or packs pulled and see what they are worth against what you paid, at live market prices. Every set, free, no account.",
  keywords: ["one piece pull tracker", "what is my one piece box worth", "one piece box opening value", "optcg pull value"],
  alternates: { canonical: "/tools/pull-tracker" },
  openGraph: pageOg("/tools/pull-tracker", { title: "One Piece Pull Tracker", description: "What did your box pull, and did it beat its price?" }),
};

export default async function PullTrackerHub() {
  const { sets } = await simSets();
  const data = sets[0] ? await simSetData(sets[0].slug, "/tools/pull-tracker") : null;
  if (!data) return <PackSimUnavailable />;
  return <PullTrackerView sets={sets} set={data} path="/tools/pull-tracker" />;
}
