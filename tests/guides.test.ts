import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AUTHORS, POSTS, postHref, postHrefFor } from "../src/lib/blog";
import { BLOG_PICKS, GUIDE_PICKS } from "../src/lib/content/featured";
import { guidesForCatalogue } from "../src/lib/content/catalogue-guides";

test("guides are served at /guides, everything else at /blog", () => {
  assert.equal(postHref({ slug: "x", category: "guide" }), "/guides/x");
  assert.equal(postHref({ slug: "x" }), "/blog/x");
  assert.equal(postHref({ slug: "x", category: "blog" }), "/blog/x");
});

test("postHrefFor resolves a slug through postHref, and an unpublished slug to the blog index", () => {
  assert.equal(postHrefFor("where-to-buy-one-piece-cards"), "/guides/where-to-buy-one-piece-cards");
  assert.equal(postHrefFor("are-one-piece-cards-cheaper-abroad"), "/blog/are-one-piece-cards-cheaper-abroad");
  assert.equal(postHrefFor("no-such-post"), "/blog");
});

// /blog/<guide> is a 308 to /guides/<guide>. A link through it costs a redirect
// hop on every crawl and every click, so no source file may build one: a guide
// slug after "/blog/" in any literal, or a /blog/ URL built from a variable
// anywhere but postHref itself and the news sitemap (blog posts only, by
// recentNewsPosts' filter, tests/news-sitemap.test.ts).
test("nothing links a guide through /blog/: post links go through postHref", () => {
  const root = path.resolve(__dirname, "..");
  const guides = POSTS.filter((p) => p.category === "guide").map((p) => p.slug);
  assert.ok(guides.length >= 2, "the guides are found");
  const BUILDERS = new Set(["src/lib/blog/index.ts", "src/lib/news-sitemap.ts"]);
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(ts|tsx|js|mjs)$/.test(e.name) ? [path.join(dir, e.name)] : []));
  const files = walk(path.join(root, "src"));
  assert.ok(files.length > 100, "the source tree is walked");
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join("/");
    const src = fs.readFileSync(f, "utf8");
    for (const slug of guides) assert.doesNotMatch(src, new RegExp(`/blog/${slug}(?![\\w-])`), `${rel} links the guide ${slug} through /blog/: use /guides/${slug} or postHref`);
    if (BUILDERS.has(rel)) continue;
    assert.doesNotMatch(src, /\/blog\/\$\{/, `${rel} builds a /blog/ URL from a slug: use postHref(post) or postHrefFor(slug)`);
    assert.doesNotMatch(src, /["'`]\/blog\/["'`]\s*\+/, `${rel} concatenates a /blog/ URL: use postHref(post) or postHrefFor(slug)`);
  }
});

test("the evergreen rarities and where-to-buy posts are guides, with FAQs and unique slugs", () => {
  const bySlug = new Map(POSTS.map((p) => [p.slug, p]));
  assert.equal(new Set(POSTS.map((p) => p.slug)).size, POSTS.length);
  for (const s of ["one-piece-card-rarities-explained", "where-to-buy-one-piece-cards"]) {
    assert.equal(bySlug.get(s)?.category, "guide", s);
    assert.ok((bySlug.get(s)?.faq?.length ?? 0) >= 4, s);
  }
  assert.equal(bySlug.get("where-to-buy-one-piece-cards")?.marketData, true);
});

test("a post's FAQ answers are plain prose with only internal links", () => {
  for (const p of POSTS) for (const f of p.faq ?? []) {
    assert.ok(f.q.endsWith("?") && f.a.length > 40, `${p.slug}: ${f.q}`);
    for (const m of f.a.matchAll(/\]\(([^)]*)\)/g)) assert.match(m[1], /^\/(?!\/)/);
  }
});

test("editor's picks name published posts in the category their list says", () => {
  const bySlug = new Map(POSTS.map((p) => [p.slug, p]));
  for (const s of GUIDE_PICKS) assert.equal(bySlug.get(s)?.category, "guide", s);
  for (const s of BLOG_PICKS) assert.notEqual(bySlug.get(s)?.category, "guide", s);
});

test("related-guide links resolve to a post's real href", () => {
  for (const route of ["card", "sealed", "sets", "price-guide", "market", "movers"] as const) {
    for (const g of guidesForCatalogue(route)) {
      const p = POSTS.find((x) => x.slug === g.slug)!;
      assert.equal(g.href, postHref(p));
    }
  }
});

test("authors are a file with unique slugs; the sitemap, feeds and llms.txt follow postHref", () => {
  assert.equal(new Set(AUTHORS.map((a) => a.slug)).size, AUTHORS.length);
  const root = path.resolve(__dirname, "..");
  for (const f of ["src/app/sitemap.ts", "src/app/feed.xml/route.ts", "src/app/feed.json/route.ts", "src/app/llms.txt/route.ts"]) assert.match(fs.readFileSync(path.join(root, f), "utf8"), /postHref/, f);
  assert.match(fs.readFileSync(path.join(root, "src/app/robots.ts"), "utf8"), /news-sitemap\.xml/);
});
