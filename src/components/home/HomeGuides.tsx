import Link from "next/link";
import type { Catalog } from "@/lib/data";
import { POSTS, postHref } from "@/lib/blog";

// Guides with thumbnails on the home page (owner, 2026-11-09): the six newest posts, each with its own share image
// (/blog/<slug>/opengraph-image or /guides/<slug>/opengraph-image, drawn once a day and cached). Server-rendered, no script.
const COUNT = 6;

export function HomeGuides({ cat }: { cat: Catalog }) {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, COUNT);
  if (!posts.length) return null;
  return (
    <section aria-labelledby="home-guides-h" data-home-guides="">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 id="home-guides-h" className="text-xl font-extrabold text-white">
          Latest One Piece guides
        </h2>
        <Link href="/blog" className="text-sm font-semibold text-brand-300 hover:underline">
          All guides and news →
        </Link>
      </div>
      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const href = postHref(p);
          const title = p.title({ cat });
          return (
            <li key={p.slug}>
              <Link href={href} className="card-surface group flex h-full flex-col overflow-hidden transition-colors hover:border-brand-300/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${href}/opengraph-image`}
                  alt={`${title}: cover`}
                  width={1200}
                  height={630}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[1200/630] w-full border-b border-white/10 bg-black/20 object-cover"
                />
                <span className="flex flex-1 flex-col p-4">
                  <span className="font-bold leading-snug text-white group-hover:text-brand-300">{title}</span>
                  <span className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-400">{p.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
