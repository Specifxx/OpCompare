// A dependency-free SVG line chart for price history and the index. Server-
// rendered; series share one y-axis. Gaps (null) break the line.
export interface Series {
  label: string;
  color: string;
  points: { x: string; y: number | null }[];
  dashed?: boolean;
}

export function LineChart({
  series,
  format,
  height = 240,
  width = 800,
  empty,
}: {
  series: Series[];
  format: (v: number) => string;
  height?: number;
  /** viewBox width: a narrower box draws the 11px labels larger in a small container (the QuickView). */
  width?: number;
  empty?: string;
}) {
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const ys = series.flatMap((s) => s.points.map((p) => p.y)).filter((y): y is number => y != null);
  if (xs.length < 2 || !ys.length) {
    return <div className="grid h-40 place-items-center rounded-md border border-dashed border-ink-700 text-sm text-slate-500">{empty ?? "Not enough history yet."}</div>;
  }
  const W = width;
  const H = height;
  // The left gutter fits the longest y label (11px mono ≈ 6.7px a character),
  // so a four-figure "US$52,960" is not clipped at the edge.
  const pad = { l: 64, r: 16, t: 14, b: 28 };
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (lo === hi) {
    lo = lo * 0.9;
    hi = hi * 1.1 || 1;
  }
  const span = hi - lo;
  lo = Math.max(0, lo - span * 0.08);
  hi = hi + span * 0.08;
  const xi = new Map(xs.map((x, i) => [x, i]));
  const X = (x: string) => pad.l + ((xi.get(x) ?? 0) / (xs.length - 1)) * (W - pad.l - pad.r);
  const Y = (y: number) => pad.t + (1 - (y - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);
  pad.l = Math.max(64, Math.ceil(Math.max(...ticks.map((t) => format(t).length)) * 6.7) + 14);
  // Deduped: with two days the middle label IS the first (one label, one key).
  const labelIdx = [...new Set([0, Math.floor((xs.length - 1) / 2), xs.length - 1])];
  const path = (pts: Series["points"]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (p.y == null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.label).join(" and ")}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke="currentColor" className="text-ink-700" strokeWidth="1" />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" className="fill-slate-500 font-mono" fontSize="11">
              {format(t)}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={X(xs[i])} y={H - 8} textAnchor={i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle"} className="fill-slate-500" fontSize="11">
            {new Date(xs[i]).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
          </text>
        ))}
        {series.map((s) => (
          <path key={s.label} d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2.2" strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" />
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
