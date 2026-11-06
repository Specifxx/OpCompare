import { HolidaySalePage, holidayMetadata } from "@/components/HolidaySalePage";

// /black-friday (DECISIONS.md, "Black Friday page", 2026-11-02; the price watch joined it 2026-11-06): one URL kept
// every year. Six hours, the floor for pages buyers act on.
export const revalidate = 21600;

export const generateMetadata = () => holidayMetadata("black-friday");

export default function Page() {
  return <HolidaySalePage event="black-friday" />;
}
