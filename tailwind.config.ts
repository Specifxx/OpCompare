import type { Config } from "tailwindcss";

// THEMEABLE TOKENS — ported from RiftCompare's tailwind.config.ts. Every neutral
// is `rgb(var(--c-<name>) / <alpha-value>)`, so the light theme remaps the whole
// palette from globals.css without a className changing. The palette itself is
// One Piece's: night-sea navy surfaces, Straw Hat red for actions, straw gold
// for the brand accent.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v("ink-950"),
          900: v("ink-900"),
          850: v("ink-850"),
          800: v("ink-800"),
          700: v("ink-700"),
          600: v("ink-600"),
        },
        // Straw Hat red — primary actions and active states. 400 is the LINK
        // shade and is themed (readable on navy and on parchment).
        brand: {
          DEFAULT: "#d92b33",
          400: v("brand-400"),
          500: "#d92b33",
          600: "#b11f27",
        },
        // Straw gold — the brand accent (logo, eyebrows, highlights). Never a
        // price colour.
        straw: {
          DEFAULT: v("straw"),
          300: v("straw"),
          500: "#e9b73a",
        },
        slate: {
          100: v("slate-100"),
          200: v("slate-200"),
          300: v("slate-300"),
          400: v("slate-400"),
          500: v("slate-500"),
          600: v("slate-600"),
          700: v("slate-700"),
          800: v("slate-800"),
          900: v("slate-900"),
        },
        white: v("white"),
        accent: v("accent"),
        gold: v("gold"),
        up: v("up"),
        down: v("down"),
        rose: { 200: v("rose-200"), 300: v("rose-300"), 400: v("rose-400") },
        red: { 300: v("red-300"), 400: v("red-400") },
        emerald: { 300: v("emerald-300"), 400: v("emerald-400") },
        amber: { 100: v("amber-100"), 200: v("amber-200"), 300: v("amber-300") },
        sky: { 200: v("sky-200"), 300: v("sky-300"), 400: v("sky-400") },
        lime: { 200: v("lime-200"), 300: v("lime-300") },
        purple: { 300: v("purple-300") },
        blue: { 300: v("blue-300") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-display)", "Impact", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
        "3xl": "12px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)",
        header: "var(--shadow-header)",
      },
      transitionDuration: { fast: "120ms", base: "180ms", slow: "280ms" },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      zIndex: { rail: "45", header: "40", dropdown: "50", overlay: "60", menu: "70", modal: "80" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        bob: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-3px)" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.6s ease-out both",
        marquee: "marquee 48s linear infinite",
        bob: "bob 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
