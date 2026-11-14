// Long secondary text folded into a native <details> (2026-11-14): the words stay
// in the server HTML for readers and crawlers alike, but a phone visitor reaches
// the prices first. No JavaScript; the summary is a real button for the keyboard.
export function ReadMore({ children, label = "Read more", className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-slate-200 hover:text-white [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">Show less</span>
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-3">{children}</div>
    </details>
  );
}
