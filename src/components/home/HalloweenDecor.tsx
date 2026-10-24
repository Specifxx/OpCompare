import { seasonMarkupLive } from "@/lib/season";

// Halloween set dressing for the hero, ported from RiftCompare (owner,
// 2026-10-24): cobwebs in the top corners, each with a spider on its thread,
// candlelit jack-o'-lanterns in the bottom corners and a few bats crossing
// the sky. Pure decoration, aria-hidden, in the hero's background layer UNDER
// the content (z-0), pointer-events none, CSS only (no script, no data).
// In the HTML only around the season (seasonMarkupLive), shown only while
// <html> carries data-season="halloween" (globals.css .op-decor), so it goes
// at the visitor's own midnight on 1 November. Motion stops under
// prefers-reduced-motion.
export function HalloweenDecor() {
  if (!seasonMarkupLive("halloween")) return null;
  return (
    <div className="op-decor" aria-hidden="true">
      <span className="op-web op-web-l" />
      <span className="op-web op-web-r" />
      <span className="op-spider op-spider-l" />
      <span className="op-spider op-spider-r" />
      <span className="op-bat op-bat-1" />
      <span className="op-bat op-bat-2" />
      <span className="op-bat op-bat-3" />
      <span className="op-pumpkins op-pumpkins-l">
        <span className="op-pumpkin" />
        <span className="op-pumpkin op-pumpkin-sm" />
      </span>
      <span className="op-pumpkins op-pumpkins-r">
        <span className="op-pumpkin op-pumpkin-sm" />
        <span className="op-pumpkin" />
      </span>
    </div>
  );
}
