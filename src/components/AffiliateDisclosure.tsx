// RiftCompare's AffiliateDisclosure: the one-line FTC-style note beside an
// affiliate link or strip, worded once here so every surface says the same.
type Partner = "ebay" | "tcgplayer" | "both";

const TEXT: Record<Partner, string> = {
  ebay: "Affiliate link: as an eBay Partner Network affiliate, OP Compare earns from qualifying purchases — at no extra cost to you.",
  tcgplayer: "Affiliate link: OP Compare earns a commission from qualifying TCGplayer purchases — at no extra cost to you.",
  both: "Affiliate links: as an eBay Partner Network affiliate and a TCGplayer affiliate, OP Compare earns from qualifying purchases — at no extra cost to you.",
};

export function AffiliateDisclosure({ partner = "ebay", tight, className }: { partner?: Partner; tight?: boolean; className?: string }) {
  return <p className={`${tight ? "mt-1" : "mt-2"} text-[11px] leading-snug text-slate-400 ${className ?? ""}`}>{TEXT[partner]}</p>;
}

export function PaidLinkTag({ className }: { className?: string }) {
  return (
    <span className={`chip bg-ink-800 text-[10px] text-slate-400 ${className ?? ""}`} title="We earn a commission on purchases through this link, at no extra cost to you.">
      Paid link
    </span>
  );
}
