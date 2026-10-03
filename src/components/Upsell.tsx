import Link from "next/link";
import { Icon } from "./Icon";

// What a visitor without the plan sees in place of a paid tool's rows
// (RiftCompare's LockedPreview and MorePremium).
export function LockedPreview({ title, children, next }: { title: string; children: React.ReactNode; next: string }) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
      <div className="grid grid-cols-2 gap-3 p-4 opacity-40 blur-[2px] sm:grid-cols-4 lg:grid-cols-6" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[5/7] rounded-lg bg-ink-800" />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/60 p-6 text-center">
        <Icon name="lock" className="h-6 w-6 text-straw" />
        <p className="mt-2 text-xl font-bold text-white">{title}</p>
        <p className="mt-1 max-w-md text-sm text-slate-300">{children}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href={`/login?next=${encodeURIComponent(next)}`} rel="nofollow" className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
            Create a free account
          </Link>
          <Link href="/premium" className="rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
            See Plus
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MoreWithPlan({ children, cta = "See Plus" }: { children: React.ReactNode; cta?: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-straw/30 bg-straw/[0.05] p-5 text-center sm:flex-row sm:text-left">
      <Icon name="crown" className="h-6 w-6 shrink-0 text-straw" />
      <p className="flex-1 text-sm text-slate-200">{children}</p>
      <Link href="/premium" className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
        {cta}
      </Link>
    </div>
  );
}
