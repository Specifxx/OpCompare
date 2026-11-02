import { SaleSeasonPage, saleMetadata } from "@/components/SaleSeasonPage";

// One URL kept every year (DECISIONS.md, "Seasonal sale pages", 2026-11-02). Six hours, the floor for pages buyers act on.
export const revalidate = 21600;

export const generateMetadata = () => saleMetadata("boxing-day");

export default function Page() {
  return <SaleSeasonPage slug="boxing-day" />;
}
