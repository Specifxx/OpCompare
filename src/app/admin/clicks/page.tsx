import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminMetadata, requireAdminPage } from "@/lib/admin";
import { CLICK_RETENTION_DAYS, RECENT_CLICKS, loadClicks, retailerLabel, type ClicksReport } from "@/lib/admin-clicks";
import { ago, int } from "@/lib/format";

export const dynamic = "force-dynamic";
export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Outbound clicks" });

// Outbound shop clicks (RiftCompare's /admin/clicks): every click on an
// a[data-retailer] link, recorded by OutboundBeacon → /api/click. Unlike
// RiftCompare's page (whose beacon was switched off for egress), this one is
// live: one small insert per click into the operational database, kept
// CLICK_RETENTION_DAYS (the import prunes older rows, lib/beacons.ts).
function Breakdown({ title, items, label = (k: string) => k }: { title: string; items: { k: string; n: number }[]; label?: (k: string) => React.ReactNode }) {
  return (
    <div className="card-surface p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">–</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.k} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-300">{label(i.k)}</span>
              <span className="num text-white">{int(i.n)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AdminClicks() {
  await requireAdminPage();
  let data: ClicksReport | null = null;
  let error: string | null = null;
  try {
    data = await loadClicks();
  } catch (e) {
    error = (e as Error).message;
  }
  const sum = (k: "d7" | "d30" | "d90") => (data ? data.rows.reduce((s, r) => s + r[k], 0) : 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white">Outbound clicks</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Every click on a shop, TCGplayer or eBay link (the links&apos; data-retailer), with the page it came from, the market, and whether the visitor was signed in. No IP, URL or user agent is stored.
        </p>
      </div>
      {error ? (
        <EmptyState title="Couldn't load clicks" body={error} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState title="No clicks recorded yet" body="They appear here as soon as someone clicks a shop link." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Clicks · 7 days" value={int(sum("d7"))} />
            <StatTile label="Clicks · 30 days" value={int(sum("d30"))} />
            <StatTile label={`Clicks · ${CLICK_RETENTION_DAYS} days`} value={int(sum("d90"))} />
            <StatTile label="Signed in · 30 days" value={int(data.signedIn30)} tone="text-gold" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-ink-800 bg-ink-900">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">Retailer</th>
                  <th className="px-3 py-2 text-right font-medium">7d</th>
                  <th className="px-3 py-2 text-right font-medium">30d</th>
                  <th className="px-3 py-2 text-right font-medium">{CLICK_RETENTION_DAYS}d</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.retailer} className="border-b border-ink-800 last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-medium text-white">{retailerLabel(r.retailer)}</span> <span className="text-xs text-slate-500">{r.retailer}</span>
                    </td>
                    <td className="num px-3 py-2 text-right text-slate-300">{int(r.d7)}</td>
                    <td className="num px-3 py-2 text-right text-slate-300">{int(r.d30)}</td>
                    <td className="num px-3 py-2 text-right text-white">{int(r.d90)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Breakdown title="By market · 30 days" items={data.byCountry} />
            <Breakdown title="By page · 30 days" items={data.byPage} />
            <Breakdown title="By entry (first touch) · 30 days" items={data.byEntry} />
            <Breakdown
              title="Top cards and products · 30 days"
              items={data.topSlugs}
              label={(k) => (
                <Link href={data?.topSlugs.find((t) => t.k === k)?.href ?? `/card/${k}`} className="text-brand-400 hover:underline">
                  {k}
                </Link>
              )}
            />
          </div>
          <section>
            <h2 className="mb-2 text-xl text-white">Recent clicks</h2>
            <p className="mb-3 text-xs text-slate-500">The last {int(Math.min(RECENT_CLICKS, data.recent.length))}, newest first.</p>
            <div className="overflow-x-auto rounded-lg border border-ink-800 bg-ink-900">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Retailer</th>
                    <th className="px-3 py-2 font-medium">Page</th>
                    <th className="px-3 py-2 font-medium">Card / product</th>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i} className="border-b border-ink-800 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-400">{ago(r.createdAt)}</td>
                      <td className="px-3 py-2 text-white">{retailerLabel(r.retailer)}</td>
                      <td className="px-3 py-2 text-slate-300">{r.page}</td>
                      <td className="px-3 py-2 text-slate-300">{r.slug ?? "–"}</td>
                      <td className="px-3 py-2 text-slate-300">{r.country}</td>
                      <td className="px-3 py-2 text-slate-400">{r.signedIn ? "signed in" : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
