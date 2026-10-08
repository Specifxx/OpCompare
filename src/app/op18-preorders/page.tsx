import type { Metadata } from "next";
import { PreorderPage, preorderMetadata, type PreorderConfig } from "@/components/PreorderPage";

// /op18-preorders: the shared pre-order page (components/PreorderPage.tsx) for OP18.
export const revalidate = 3600;

const CONFIG: PreorderConfig = {
  code: "OP18",
  path: "/op18-preorders",
  label: "OP18",
  fallbackName: "The Dominance of God",
  kindLine: "the next main booster set",
  explain: ["box", "case", "pack", "double"],
  title: "OP18 Booster Box Pre-Order Prices Compared",
  keywords: ["OP18 pre-order", "OP18 booster box price", "One Piece OP18 preorder", "The Dominance of God booster box", "cheapest OP18 booster box", "One Piece OP18 release date"],
  ogTitle: "One Piece OP18 Pre-Order Prices: Compared Across Every Store",
  ogDescription: "Booster boxes, cases and packs: every tracked store's pre-order price beside TCGplayer and eBay, cheapest first.",
  eventCode: "OP18 RE",
};

export const generateMetadata = (): Promise<Metadata> => preorderMetadata(CONFIG);

export default function Op18PreordersPage() {
  return <PreorderPage cfg={CONFIG} />;
}
