import type { Metadata } from "next";
import { PreorderPage, preorderMetadata, type PreorderConfig } from "@/components/PreorderPage";

// /eb05-preorders: the shared pre-order page (components/PreorderPage.tsx) for EB05,
// which releases before OP18.
export const revalidate = 3600;

const CONFIG: PreorderConfig = {
  code: "EB05",
  path: "/eb05-preorders",
  label: "EB05",
  fallbackName: "Extra Booster: One Piece Heroines Edition Vol. 2",
  kindLine: "an Extra Booster, released separately from the numbered main sets",
  explain: ["box", "case", "pack"],
  title: "EB05 Booster Box Pre-Order Prices Compared",
  keywords: ["EB05 pre-order", "EB05 booster box price", "One Piece EB05 preorder", "Heroines Edition Vol. 2 booster box", "Extra Booster Heroines Edition Vol.2", "One Piece EB05 release date"],
  ogTitle: "One Piece EB05 Pre-Order Prices: Compared Across Every Store",
  ogDescription: "Heroines Edition Vol. 2 booster boxes, cases and packs: every tracked store's pre-order price beside TCGplayer and eBay, cheapest first.",
};

export const generateMetadata = (): Promise<Metadata> => preorderMetadata(CONFIG);

export default function Eb05PreordersPage() {
  return <PreorderPage cfg={CONFIG} />;
}
