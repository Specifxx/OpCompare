import type { Metadata } from "next";
import { pageOg } from "@/lib/og/meta";
import { simSetData, simSets } from "./load";
import { PackSimUnavailable, PackSimView } from "./view";

// /tools/pack-sim — the pack simulator on the newest released set. Real ISR, as
// /tools/box-ev: nothing here reads the visitor, every card is in USD and the
// client converts. Each set also has its own page (./[set]), which is what a
// search for "OP13 pack simulator" lands on.
export const revalidate = 86400;

const TITLE = "One Piece Pack Opening Simulator: Free TCG Pack Opener | OP Compare";
const DESCRIPTION =
  "Open free virtual One Piece Card Game booster packs, or a whole box, from every set. Real cards, community pull rates and live market prices on every pull.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ["one piece pack simulator", "one piece tcg pack opening simulator", "one piece booster box simulator", "optcg pack opener", "one piece card game pack simulator"],
  alternates: { canonical: "/tools/pack-sim" },
  openGraph: pageOg("/tools/pack-sim", { title: "One Piece Pack Opening Simulator", description: "Rip free virtual One Piece packs and boxes with real cards and live prices." }),
};

export default async function PackSimHub() {
  const { sets } = await simSets();
  const data = sets[0] ? await simSetData(sets[0].slug, "/tools/pack-sim") : null;
  if (!data) return <PackSimUnavailable />;
  return <PackSimView sets={sets} set={data} path="/tools/pack-sim" />;
}
