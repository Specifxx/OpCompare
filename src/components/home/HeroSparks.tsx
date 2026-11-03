"use client";
// The hero's living background (owner, 2026-11-03: the card engine's hero,
// after RiftCompare's embers, on every site): drifting motes in the site's own colours that part around the
// pointer, a soft light that follows it, and a burst of sparks where it
// clicks or taps. One canvas, transform-free, under the hero's content and
// aria-hidden; nothing a crawler reads changes. Stops for reduced motion and
// while the tab or the hero is off screen, so it never costs a frame when
// nobody is looking at it.
import { useEffect, useRef } from "react";

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  tint: number; // index into the palette
  life: number; // frames left for a spark; Infinity for a drifting mote
  max: number;
}

function rgbVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? v.split(/\s+/).join(",") : fallback;
}

export function HeroSparks() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    let palette: string[] = [];
    let light = false;
    const readTheme = () => {
      light = root.getAttribute("data-theme") === "light";
      palette = [rgbVar("--c-brand", "230,0,38"), rgbVar("--c-brand-400", "255,107,107"), rgbVar("--c-brand-300", "255,150,150"), light ? "40,50,80" : "255,255,255"];
    };
    readTheme();

    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    const pointer = { x: 0, y: 0, on: 0, target: 0 };

    const drift = (fresh: boolean): Mote => ({
      x: Math.random() * w,
      y: fresh ? h + 10 : Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(0.12 + Math.random() * 0.35),
      r: Math.random() < 0.1 ? 2.2 + Math.random() * 1.2 : 0.8 + Math.random() * 1.4,
      a: 0.25 + Math.random() * 0.5,
      tint: Math.random() < 0.7 ? 0 : Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 2 : 3,
      life: Infinity,
      max: Infinity,
    });
    const spark = (x: number, y: number): Mote => {
      const ang = Math.random() * Math.PI * 2;
      const v = 1.2 + Math.random() * 3.2;
      const life = 36 + Math.random() * 30;
      return { x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 0.6, r: 0.8 + Math.random() * 1.6, a: 1, tint: Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : 2, life, max: life };
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = reduced ? 0 : Math.max(24, Math.min(110, Math.round((w * h) / 9000)));
      const kept = motes.filter((m) => m.life === Infinity).slice(0, want);
      while (kept.length < want) kept.push(drift(false));
      motes = kept.concat(motes.filter((m) => m.life !== Infinity));
      if (!pointer.on) {
        pointer.x = w / 2;
        pointer.y = h * 0.4;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pointer.on += (pointer.target - pointer.on) * 0.08;
      // A soft light where the pointer is.
      if (pointer.on > 0.01) {
        const R = 220;
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, R);
        g.addColorStop(0, `rgba(${palette[0]},${(light ? 0.16 : 0.2) * pointer.on})`);
        g.addColorStop(1, `rgba(${palette[0]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(pointer.x - R, pointer.y - R, R * 2, R * 2);
      }
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        if (m.life !== Infinity) {
          m.life -= 1;
          if (m.life <= 0) {
            motes.splice(i, 1);
            continue;
          }
          m.vx *= 0.96;
          m.vy = m.vy * 0.96 + 0.03;
        } else if (pointer.on > 0.05) {
          // Motes part around the pointer.
          const dx = m.x - pointer.x;
          const dy = m.y - pointer.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 140) {
            const f = ((140 - d) / 140) * 0.35 * pointer.on;
            m.vx += (dx / d) * f;
            m.vy += (dy / d) * f;
          }
          m.vx *= 0.985;
          m.vy = m.vy * 0.985 - 0.002;
        }
        m.x += m.vx;
        m.y += m.vy;
        if (m.life === Infinity && (m.y < -10 || m.x < -10 || m.x > w + 10)) motes[i] = drift(true);
        const fade = m.life === Infinity ? m.a : m.a * (m.life / m.max);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${palette[m.tint]},${fade})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let visible = true;
    let running = false;
    const loop = () => {
      raf = 0;
      if (!visible || document.hidden) {
        running = false;
        return;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    // Pointer events are read on the window and tested against the hero's box,
    // so the canvas can sit under a pointer-events:none decoration layer and
    // the content above it still counts (a click on a chip sparks too).
    const local = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (!p) {
        pointer.target = 0;
        return;
      }
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.target = 1;
      start();
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      const p = local(e);
      if (!p) return;
      const n = 18 + Math.floor(Math.random() * 10);
      for (let i = 0; i < n; i++) motes.push(spark(p.x, p.y));
      start();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(host);
    const onVisibility = () => {
      if (!document.hidden) start();
    };
    const mo = new MutationObserver(readTheme);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    if (reduced) draw();
    else start();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="hero-sparks" aria-hidden="true" />;
}
