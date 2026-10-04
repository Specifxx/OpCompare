"use client";

import { WatchDrawerButton } from "./WatchDrawer";

// PLACEHOLDER owned by the wave-2 `member` track, which replaces this file with
// RiftCompare's HeaderWatchButton (the account-backed watchlist bar and the
// WatchlistDrawerProvider slider). Until then the header keeps wave 1's
// browser-local watchlist drawer here, so the heart never disappears.
export function HeaderWatchButton({ className = "" }: { className?: string }) {
  return <WatchDrawerButton className={className} />;
}
