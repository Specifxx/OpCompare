import Link from "next/link";
import { seasonMarkupLive } from "@/lib/season";

// Halloween (16-31 October, owner 2026-10-24; RiftCompare's "Nocturne is
// coming"): a spooky Thriller Bark line above the hero's logo, to Brook's
// cards. Its own component so the whole season comes out by deleting this
// file and its call. In the HTML only around the season (seasonMarkupLive,
// a day of slack for the page cache), shown only while <html> carries
// data-season="halloween" (lib/season.ts, globals.css .op-thriller).
export function ThrillerBarkComing() {
  if (!seasonMarkupLive("halloween")) return null;
  return (
    <div className="mb-3 flex justify-center sm:mb-4">
      <Link href="/search?q=Brook" className="op-thriller">
        <span className="op-eyes" aria-hidden="true">
          <i />
          <i />
        </span>
        <b>Thriller Bark awaits</b>
        <span className="hidden sm:inline">· Brook&apos;s prices, before Moria steals your shadow →</span>
      </Link>
    </div>
  );
}
