import Link from "next/link";

// A slim line of links to the sealed pages, in place of the sealed shelf (owner, 2026-11-17: no point having the
// sealed products on the front page; chase cards earn more). The /sealed pages, their URLs, titles and metadata
// are untouched, and the front page keeps its internal links to them. No product tiles, no data read.
export function HomeSealedLinks({ kinds }: { kinds: string[] }) {
  if (kinds.length === 0) return null;
  return (
    <nav aria-label="One Piece sealed product" className="-mt-4 flex flex-wrap items-center gap-2 text-sm">
      <Link href="/sealed" className="font-semibold text-brand-300 hover:underline">
        Sealed prices:
      </Link>
      {kinds.map((k) => (
        <Link key={k} href={`/sealed?kind=${encodeURIComponent(k)}`} className="chip text-xs hover:border-ink-600 hover:text-white">
          {k}
        </Link>
      ))}
    </nav>
  );
}
