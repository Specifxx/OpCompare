import { TIER_COMPARISON } from "@/lib/plans";
import { Icon } from "./Icon";

// THE TIER COMPARISON — one list of rows (TIER_COMPARISON in lib/plans.ts), one
// renderer, shown on /premium AND in the Plan dialog (RiftCompare's
// TierComparisonTable), so the two can never give different answers to "what
// do I get?". Not a client component: no state, so it renders inside the
// server-rendered page and the client dialog alike. Every row is a real
// entitlement; change a row in plans.ts, never here.
function Cell({ v }: { v: string }) {
  if (v === "✓")
    return (
      <>
        <Icon name="check" className="mx-auto h-4 w-4 text-emerald-400" />
        <span className="sr-only">Included</span>
      </>
    );
  if (!v)
    return (
      <>
        <span className="text-slate-600" aria-hidden>
          –
        </span>
        <span className="sr-only">Not included</span>
      </>
    );
  return <span className="text-slate-200">{v}</span>;
}

export function TierComparisonTable({ compact = false }: { compact?: boolean }) {
  const pad = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  return (
    <table className={`w-full text-left ${compact ? "text-xs" : "text-sm"}`}>
      <thead>
        <tr className="border-b border-ink-700 text-slate-400">
          <th scope="col" className={`${pad} font-medium`}>
            {compact ? "" : "Feature"}
          </th>
          <th scope="col" className={`${pad} text-center font-medium`}>
            Free
          </th>
          <th scope="col" className={`${pad} text-center font-medium`}>
            Plus
          </th>
          <th scope="col" className={`${pad} text-center font-semibold text-gold`}>
            Premium
          </th>
        </tr>
      </thead>
      <tbody>
        {TIER_COMPARISON.map(([f, free, plus, prem]) => (
          <tr key={f} className="border-b border-ink-800 last:border-0">
            <th scope="row" className={`${pad} font-normal text-slate-200`}>
              {f}
            </th>
            <td className={`${pad} text-center`}>
              <Cell v={free} />
            </td>
            <td className={`${pad} text-center`}>
              <Cell v={plus} />
            </td>
            <td className={`${pad} text-center`}>
              <Cell v={prem} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
