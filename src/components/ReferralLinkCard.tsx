"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { useMe } from "@/lib/use-me";
import { TIER_NAMES } from "@/lib/plans";

// "Invite a friend" on /profile (RiftCompare's ReferralLinkCard). The server
// parent passes the built URL and the days figure, and hides the card while
// the program is off (REFERRAL_PREMIUM_DAYS = 0, OP Compare's default — see
// lib/referral.ts); this client half only handles the copy button. The reward
// extends the referrer's OWN tier, so the copy names it.
export function ReferralLinkCard({ url, days }: { url: string; days: number }) {
  const [copied, setCopied] = useState(false);
  const { me } = useMe();
  const rewardName = TIER_NAMES[me.tier ?? "plus"];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackEvent("referral_link_copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — the input is selectable by hand */
    }
  }

  return (
    <div className="card-surface mt-5 p-5">
      <h2 className="font-bold text-white">Invite a friend</h2>
      <p className="mt-1 text-sm text-slate-400">
        Share your link — you get{" "}
        <span className="font-semibold text-gold">
          {days === 1 ? "1 day" : `${days} days`} of {rewardName}
        </span>{" "}
        for every friend who creates a free account.
      </p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="input flex-1 text-xs" aria-label="Your referral link" />
        <button type="button" onClick={copy} className="btn-primary shrink-0 text-sm">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
