import type { Metadata } from "next";
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
      <WatchlistView />
      <RecentlyViewed className="mt-8" title="Recently viewed — tap one to look again" />
    </div>
  );
}
