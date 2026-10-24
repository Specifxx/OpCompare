import { cardImage } from "@/lib/images";

// Card art. RiftCompare's CardImage in shape: a rounded-lg, isolated box on a
// near-black ground with the scan object-cover inside it, lazy unless it is the
// page's priority image. OP Compare's scans are TCGplayer's 300×419 product
// images (lib/images.ts); there is no blur placeholder or AVIF manifest.
export function CardImage({
  id,
  hasImage,
  alt,
  size = "tile",
  priority = false,
  className = "",
}: {
  id: number;
  hasImage: boolean;
  alt: string;
  size?: "thumb" | "tile" | "large";
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative isolate overflow-hidden rounded-lg ${className}`} style={{ backgroundColor: "#080b11" }}>
      <div className="absolute inset-0 bg-ink-950/40" />
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cardImage[size](id)}
          alt={alt}
          {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : { loading: "lazy" as const, decoding: "async" as const })}
          width={300}
          height={419}
          className="relative z-10 h-full w-full object-cover"
        />
      ) : (
        <NoScan />
      )}
    </div>
  );
}

// The plain art block used by detail pages and lists (card page hero, leader
// pages, store pages, CardLinkGrid).
export function CardArt({ id, hasImage, alt, size = "tile", className = "" }: { id: number; hasImage: boolean; alt: string; size?: "thumb" | "tile" | "large"; className?: string }) {
  if (!hasImage) {
    return (
      <div className={`relative aspect-[300/419] overflow-hidden rounded-md bg-ink-800 ${className}`}>
        <NoScan />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cardImage[size](id)}
      alt={alt}
      loading={size === "large" ? "eager" : "lazy"}
      decoding="async"
      width={300}
      height={419}
      className={`aspect-[300/419] w-full rounded-md bg-ink-800 object-cover ${className}`}
    />
  );
}

// A printing TCGplayer has published no scan for yet (new sets before release,
// some promos: hasImage is false in the snapshot). A plain card-shaped frame
// that says so, never another printing's art or a guessed URL: Bandai's own
// card images send `Cross-Origin-Resource-Policy: same-site`, so a hotlink
// would not load anyway (DECISIONS "Cards without a scan", 2026-10-24).
function NoScan() {
  return (
    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[inherit] border border-dashed border-ink-700 p-2 text-center">
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 9h6M9 13h6M9 17h3" strokeLinecap="round" />
      </svg>
      <span className="text-[11px] leading-tight text-slate-500">Image not published yet</span>
    </div>
  );
}
