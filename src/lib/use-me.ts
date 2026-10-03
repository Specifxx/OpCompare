"use client";

// The visitor's account state, for the header and the ad-free switch. The
// browser asks /api/me ONLY when the readable oc_auth hint cookie says someone
// signed in on this device, so signed-out visitors (most of them) cost no
// request. One fetch per page load, shared by every caller.
import { useEffect, useState } from "react";
import type { Tier } from "./plans";

export interface Me {
  user: { name: string; email: string; avatar: string | null } | null;
  tier: Tier | null;
  adFree: boolean;
  until: string | null;
  admin: boolean; // the caller's own flag, only to show the menu's "Admin" link
}

export const SIGNED_OUT: Me = { user: null, tier: null, adFree: false, until: null, admin: false };
const AD_FREE_COOKIE = "oc_adfree";

let pending: Promise<Me> | null = null;

function hasCookie(name: string): boolean {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${name}=`) && c !== `${name}=`);
}

export function fetchMe(): Promise<Me> {
  if (!hasCookie("oc_auth")) return Promise.resolve(SIGNED_OUT);
  pending ??= fetch("/api/me", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Partial<Me>>).then((m): Me => ({ ...SIGNED_OUT, ...m, admin: m.admin === true })) : SIGNED_OUT))
    .catch(() => SIGNED_OUT);
  return pending;
}

export function invalidateMe() {
  pending = null;
  window.dispatchEvent(new Event("oc:me"));
}

/** Keep the ad-free first-paint hint (read by AD_FREE_BOOT_SCRIPT) in step with the account. */
function syncAdFree(adFree: boolean) {
  try {
    if (adFree) document.cookie = `${AD_FREE_COOKIE}=1; path=/; max-age=${31 * 86400}; samesite=lax`;
    else if (hasCookie(AD_FREE_COOKIE)) document.cookie = `${AD_FREE_COOKIE}=; path=/; max-age=0`;
    document.documentElement.toggleAttribute("data-adfree", adFree);
  } catch {
    /* cookies blocked */
  }
}

export function useMe(): { me: Me; loaded: boolean } {
  const [state, setState] = useState<{ me: Me; loaded: boolean }>({ me: SIGNED_OUT, loaded: false });
  useEffect(() => {
    let live = true;
    const load = () =>
      fetchMe().then((me) => {
        if (!live) return;
        syncAdFree(me.adFree);
        setState({ me, loaded: true });
      });
    load();
    window.addEventListener("oc:me", load);
    return () => {
      live = false;
      window.removeEventListener("oc:me", load);
    };
  }, []);
  return state;
}
