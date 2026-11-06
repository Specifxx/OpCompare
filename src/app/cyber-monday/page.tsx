import { HolidaySalePage, holidayMetadata } from "@/components/HolidaySalePage";

// /cyber-monday (DECISIONS.md, "Black Friday and Cyber Monday price watch pages", 2026-11-06): the Black Friday page
// under Cyber Monday's own URL and title, so the Monday query has a page of its own. One URL kept every year. Six
// hours, the floor for pages buyers act on.
export const revalidate = 21600;

export const generateMetadata = () => holidayMetadata("cyber-monday");

export default function Page() {
  return <HolidaySalePage event="cyber-monday" />;
}
