import Link from "next/link";

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = new Set<number>([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages));
  const sorted = [...nums].sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-ghost min-h-10 px-3" rel="prev">
          ← Prev
        </Link>
      ) : null}
      {sorted.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - sorted[i - 1] > 1 ? <span className="px-1 text-slate-500">…</span> : null}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={`grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm font-semibold ${
              n === page ? "border-brand-500 bg-brand-500/15 text-white" : "border-ink-700 bg-ink-900 text-slate-300 hover:border-ink-600"
            }`}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className="btn-ghost min-h-10 px-3" rel="next">
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
