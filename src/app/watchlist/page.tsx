import type { Metadata } from "next";
import { DiscoveryTip } from "@/components/DiscoveryTip";
import { Breadcrumbs } from "@/components/ui";
import { WatchlistView } from "@/components/WatchlistView";
import { RecentlyViewed } from "@/components/RecentlyViewed";

export const metadata: Metadata = {
  title: "My Watchlist",
  robots: { index: false },
};

export default function WatchlistPage() {
  return (
    <div className="container-app py-6">
      <Breadcrumbs items={[{ label: "My watchlist" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">My watchlist</h1>
      <p className="mt-3 max-w-3xl text-[15px] text-slate-300">
        Cards and sealed products you have hearted, with today&apos;s cheapest price in your market. Your watchlist is saved in this browser — no account
        needed.
      </p>
      <DiscoveryTip id="watchlist-buy-list" surface="tip:watchlist" tier="premium" className="mt-4">
        Premium&apos;s Buy List Planner turns this watchlist into the cheapest single store for the lot, and the cheapest way to split it across stores.
      </DiscoveryTip>
      <WatchlistView />
      <RecentlyViewed className="mt-8" title="Recently viewed — tap one to look again" />
    </div>
  );
}
