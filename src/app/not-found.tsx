import Link from "next/link";

// Branded 404 in RiftCompare's shape (the number, the heading, the way back).
// The wave-2 design track adds RiftCompare's hero search, popular cards, set
// chips and guides below it, read through src/lib/data.ts loaders.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="text-center">
        <p className="num text-6xl font-extrabold text-brand-400">404</p>
        <h1 className="mt-3 text-2xl font-extrabold text-white">This page doesn&apos;t exist</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          The card or page you were after may have moved, or may never have existed. Search the
          database — every One Piece Card Game card is in there, with live prices from stores in six
          markets.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/browse" className="btn-primary">Card database</Link>
        <Link href="/movers" className="btn-ghost">This week&apos;s price movers</Link>
        <Link href="/sealed" className="btn-ghost">Sealed products</Link>
        <Link href="/blog" className="btn-ghost">Guides &amp; news</Link>
      </div>
    </div>
  );
}
