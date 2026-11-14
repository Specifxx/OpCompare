// RiftCompare's article and static-page typography, as class strings for a
// container whose children are plain HTML elements. RiftCompare writes these
// classes onto each element (components/Markdown.tsx, app/about/page.tsx); OP
// Compare's blog and static pages render ordinary <p>/<h2>/<ul> children, so
// the same values are applied through arbitrary child variants. Replaces OP's
// old `.prose-op` class (wave 2, 2026-10-03). Literal strings: Tailwind only
// generates the classes it can see verbatim in source.

/**
 * A blog article body (2026-11-14 article typography): 16-17px text on a 1.7
 * line height, a ~65-character measure for every text block, a clear two-step
 * heading scale in the site's heading face, quiet list markers, and links that
 * read as links. Every rule skips anything inside `.not-prose` (the sign-up
 * card, the tables, the shop strips), so a button in a post keeps its own
 * colours: the old `[&_a]` rule painted "Create a free account" red on red.
 */
export const ARTICLE_PROSE =
  "text-base leading-[1.7] sm:text-[17px] " +
  "[&_p:not(.not-prose_p)]:my-4 [&_p:not(.not-prose_p)]:max-w-[65ch] [&_p:not(.not-prose_p)]:text-slate-300 " +
  "[&_h2:not(.not-prose_h2)]:mb-3 [&_h2:not(.not-prose_h2)]:mt-12 [&_h2:not(.not-prose_h2)]:max-w-[65ch] [&_h2:not(.not-prose_h2)]:scroll-mt-header [&_h2:not(.not-prose_h2)]:text-[22px] [&_h2:not(.not-prose_h2)]:font-extrabold [&_h2:not(.not-prose_h2)]:leading-tight [&_h2:not(.not-prose_h2)]:text-white sm:[&_h2:not(.not-prose_h2)]:text-2xl " +
  "[&_h3:not(.not-prose_h3)]:mb-2 [&_h3:not(.not-prose_h3)]:mt-8 [&_h3:not(.not-prose_h3)]:max-w-[65ch] [&_h3:not(.not-prose_h3)]:scroll-mt-header [&_h3:not(.not-prose_h3)]:text-lg [&_h3:not(.not-prose_h3)]:font-bold [&_h3:not(.not-prose_h3)]:leading-snug [&_h3:not(.not-prose_h3)]:text-white " +
  "[&_ul:not(.not-prose_ul)]:my-4 [&_ul:not(.not-prose_ul)]:max-w-[65ch] [&_ul:not(.not-prose_ul)]:list-disc [&_ul:not(.not-prose_ul)]:space-y-2 [&_ul:not(.not-prose_ul)]:pl-6 [&_ul:not(.not-prose_ul)]:text-slate-300 " +
  "[&_ol:not(.not-prose_ol)]:my-4 [&_ol:not(.not-prose_ol)]:max-w-[65ch] [&_ol:not(.not-prose_ol)]:list-decimal [&_ol:not(.not-prose_ol)]:space-y-2 [&_ol:not(.not-prose_ol)]:pl-6 [&_ol:not(.not-prose_ol)]:text-slate-300 " +
  "[&_li:not(.not-prose_li)]:pl-1 [&_li:not(.not-prose_li)]:marker:text-slate-500 " +
  "[&_:is(p,li)>a]:font-medium [&_:is(p,li)>a]:text-brand-400 [&_:is(p,li)>a]:underline [&_:is(p,li)>a]:decoration-brand-400/40 [&_:is(p,li)>a]:underline-offset-2 hover:[&_:is(p,li)>a]:decoration-brand-400 " +
  "[&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_em]:text-slate-200";

/** A static page body (about, privacy, terms…): the article's measure and rhythm at a calmer size. */
export const PAGE_PROSE =
  "text-[15px] leading-[1.7] text-slate-300 [&_p]:my-4 [&_p]:max-w-[65ch] " +
  "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:max-w-[65ch] [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:leading-tight [&_h2]:text-white " +
  "[&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:max-w-[65ch] [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-white " +
  "[&_ul]:my-4 [&_ul]:max-w-[65ch] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:marker:text-slate-500 " +
  "[&_a]:text-brand-400 [&_a]:underline [&_a]:decoration-brand-400/40 [&_a]:underline-offset-2 hover:[&_a]:decoration-brand-400 [&_strong]:text-white";

/**
 * A plain data table in RiftCompare's markup (`w-full text-sm`, an uppercase
 * slate-500 header row over a hairline, hairline rows). Replaces OP's old
 * `.data-table` class; th/td padding comes from the variants so existing
 * table markup keeps its shape.
 */
export const DATA_TABLE =
  "w-full text-sm [&_thead_th]:border-b [&_thead_th]:border-ink-700 [&_thead_th]:px-3 [&_thead_th]:py-2 [&_thead_th]:text-left " +
  "[&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wide [&_thead_th]:text-slate-500 " +
  "[&_tbody_tr]:border-b [&_tbody_tr]:border-ink-800 [&_tbody_tr]:transition-colors hover:[&_tbody_tr]:bg-ink-800/40 [&_tbody_td]:px-3 [&_tbody_td]:py-2";
