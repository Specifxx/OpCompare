"use client";

import { Analytics } from "@vercel/analytics/next";
import { useConsent } from "@/lib/use-consent";

// RiftCompare's ConsentGatedAnalytics: Vercel Analytics mounts only once
// useConsent() resolves (a CMP grant, or the no-CMP grace period), never on the
// first paint. RiftCompare also mounts Speed Insights here; OP Compare does not
// ship that package.
export function ConsentGatedAnalytics() {
  const { analytics } = useConsent();
  if (!analytics) return null;
  return <Analytics />;
}
