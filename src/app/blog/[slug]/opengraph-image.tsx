import { ImageResponse } from "next/og";
import { postBySlug } from "@/lib/blog";
import { postContext } from "@/lib/blog/context";
import { cardImage } from "@/lib/images";

export const runtime = "nodejs";
export const alt = "OP Compare blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A post's share card: its title beside its three hero cards.
export default async function Image({ params }: { params: { slug: string } }) {
  const post = postBySlug(params.slug);
  let title = "OP Compare blog";
  let cards: number[] = [];
  if (post) {
    try {
      const ctx = await postContext("US");
      title = post.title(ctx);
      cards = post.build(ctx).heroCards.filter((c) => c.hasImage).map((c) => c.id).slice(0, 3);
    } catch {
      /* brand card below */
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "radial-gradient(circle at 20% 0%, #3a1016 0%, #070c16 65%)", color: "#fff", padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: cards.length ? 620 : 1088 }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
            <span style={{ color: "#ff4d55" }}>OP</span>
            <span>Compare</span>
            <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: 14 }}>· Blog</span>
          </div>
          <div style={{ fontSize: title.length > 60 ? 50 : 60, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 24, color: "#f5c542" }}>One Piece card prices, compared</div>
        </div>
        {cards.length ? (
          <div style={{ display: "flex", alignItems: "center", marginLeft: 24, position: "relative", width: 460 }}>
            {cards.map((id, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={id}
                alt=""
                src={cardImage.large(id)}
                width={220}
                height={307}
                style={{ position: "absolute", left: i * 110, top: 60 + (i % 2) * 40, borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}
              />
            ))}
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
