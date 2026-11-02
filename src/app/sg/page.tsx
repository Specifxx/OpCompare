import type { Metadata } from "next";
import { regionMetadata } from "@/lib/home-metadata";
import { RegionHome } from "@/components/home/RegionHome";

// The SG region home (RiftCompare's /sg): the homepage body locked to one
// market, with reciprocal hreflang. Static like "/" (ISR, hourly).
export const revalidate = 21600; // six hours: Vercel cost ceiling (owner, 2026-11-02)

export function generateMetadata(): Promise<Metadata> {
  return regionMetadata("SG");
}

export default function SGHomePage() {
  return <RegionHome region="SG" />;
}
