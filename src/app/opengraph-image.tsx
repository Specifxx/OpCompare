import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OP Compare — One Piece card prices compared";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The site's share card: the straw-hat mark, the wordmark and the promise.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 0%, #3a1016 0%, #070c16 60%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="190" height="190" viewBox="0 0 64 64">
          <ellipse cx="32" cy="41" rx="29" ry="11" fill="#e9b73a" stroke="#7d520e" strokeWidth="1.6" />
          <path d="M15 40 C15 12.5 49 12.5 49 40 Z" fill="#f5c542" stroke="#7d520e" strokeWidth="1.6" />
          <path d="M15.3 33 C24 37.4 40 37.4 48.7 33 L49 40 C40 44.2 24 44.2 15 40 Z" fill="#d92b33" stroke="#6e1016" strokeWidth="1.2" />
        </svg>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 900, marginTop: 10, letterSpacing: -2 }}>
          <span style={{ color: "#ff4d55" }}>OP</span>
          <span>Compare</span>
        </div>
        <div style={{ fontSize: 38, color: "#cbd5e1", marginTop: 10 }}>One Piece card prices, compared across every store</div>
        <div style={{ fontSize: 28, color: "#f5c542", marginTop: 26, letterSpacing: 4 }}>US · AU · UK · SG · CA · EU</div>
      </div>
    ),
    size,
  );
}
