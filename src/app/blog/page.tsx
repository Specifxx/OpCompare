import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { POSTS, postHref } from "@/lib/blog";
import { postContext } from "@/lib/blog/context";
import { getCountry } from "@/lib/get-country";
import { shortDate } from "@/lib/format";
import { pageOg } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "One Piece TCG Blog — Prices, Guides & Market Analysis",
  description:
    "One Piece Card Game market analysis, buying guides and set reviews, with every figure drawn from OP Compare's own price database.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: pageOg("/blog"),
};

export default async function BlogIndex() {
  const ctx = await postContext(getCountry());
  const posts = POSTS.filter((p) => p.category !== "guide").map((p) => ({
    p,
    title: p.title(ctx),
  }));
  return (
    <div>
      <Breadcrumbs trail={[{ name: "Blog" }]} />
      <h1 className="text-2xl font-extrabold text-white">Blog</h1>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-300">
        <p>
          Market analysis, buying guides and set reviews for the One Piece Card
          Game. Every price and figure in a post comes from OP Compare&apos;s
          own price database — the same one behind every comparison on the site
          — and refreshes with it, so a post never quotes a stale number.
        </p>
        <p>
          Who writes them and how is on the{" "}
          <Link href="/authors" className="text-brand-400 hover:underline">
            authors page
          </Link>{" "}
          and in our{" "}
          <Link href="/editorial-policy" className="text-brand-400 hover:underline">
            editorial policy
          </Link>
          ;{" "}
          <Link href="/methodology" className="text-brand-400 hover:underline">
            the methodology
          </Link>{" "}
          explains how prices are collected. Prefer a feed?{" "}
          <a href="/feed.xml" className="text-brand-400 hover:underline">
            RSS
          </a>
          . Evergreen explainers live in the{" "}
          <Link href="/guides" className="text-brand-400 hover:underline">
            guides
          </Link>
          .
        </p>
      </div>
      <p className="rb-eyebrow mt-8 flex items-center gap-2 text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Latest{" "}
        <span className="font-sans text-xs font-normal text-slate-500">
          · {posts.length}
        </span>
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(({ p, title }, i) => (
          <Link
            key={p.slug}
            href={postHref(p)}
            className="card-surface group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-ink-600 hover:shadow-glow"
          >
            {/* The thumbnail is the post's own share image (its title beside
                its hero cards, drawn by blog/[slug]/opengraph-image.tsx and
                cached a day): RiftCompare's 1.91:1 hero strip, and a post
                whose cards have no scan yet still gets a real picture (the
                image draws only cards with art, or its data-free fallback). */}
            <div className="relative aspect-[1200/630] w-full shrink-0 overflow-hidden border-b border-ink-800 bg-ink-850">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${postHref(p)}/opengraph-image`}
                alt={title}
                width={1200}
                height={630}
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap gap-1.5">
                {i === 0 ? (
                  <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400">
                    New
                  </span>
                ) : null}
                {p.tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="mt-2 text-lg leading-snug text-white group-hover:text-brand-400">
                {title}
              </h2>
              <p className="mt-1 line-clamp-3 text-sm text-slate-400">
                {p.description}
              </p>
              <p className="mt-auto pt-3 text-xs text-slate-500">
                {shortDate(p.date)} · {p.minutes} min read
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
