"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// The overlay shell (RiftCompare's components/ui/Dialog.tsx, ported): portals
// into <body>, locks page scroll, traps Tab, closes on Escape (the TOPMOST layer
// only) and on a backdrop click, and gives focus back to the opener on close.
// It owns no chrome: header, close button and body belong to each caller.
//
// The shared side effects are refcounted, so two overlays open at once (a
// report dialog opened from inside the QuickView) release the lock and the
// <body data-oc-dialog> flag only when the LAST one closes.

let lockCount = 0;
let prevOverflow = "";
let prevPadding = "";
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      const body = document.body;
      prevOverflow = body.style.overflow;
      prevPadding = body.style.paddingRight;
      // Keep the page from jumping sideways when its scrollbar disappears.
      const gutter = window.innerWidth - document.documentElement.clientWidth;
      if (gutter > 0) body.style.paddingRight = `${gutter}px`;
      body.style.overflow = "hidden";
      body.dataset.ocDialog = "1";
    }
    lockCount++;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPadding;
        delete document.body.dataset.ocDialog;
      }
    };
  }, [active]);
}

// Escape closes the topmost layer only: each open layer pushes an id, and a
// keydown acts only for the id on top (all listeners run in the same dispatch,
// before any cleanup pops the stack).
const escStack: symbol[] = [];
export function useEscapeLayer(active: boolean, onEscape: () => void) {
  const cb = useRef(onEscape);
  cb.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const id = Symbol("escape-layer");
    escStack.push(id);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && escStack[escStack.length - 1] === id) cb.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = escStack.indexOf(id);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, [active]);
}

/** Mounted while open or leaving; `entered` drives the enter/exit transition. */
function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, entered };
}

export type DialogSize = "md" | "lg" | "xl" | "2xl" | "3xl";
// Literal strings: Tailwind only generates classes it can see verbatim.
const SIZE_CLASS: Record<DialogSize, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Dialog({
  open,
  onClose,
  children,
  label,
  labelledBy,
  size = "md",
  initialFocusRef,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label?: string;
  labelledBy?: string;
  size?: DialogSize;
  initialFocusRef?: RefObject<HTMLElement>;
  className?: string;
}) {
  const { mounted, entered } = usePresence(open, 140);
  const panelRef = useRef<HTMLDivElement>(null);
  const openedFrom = useRef<HTMLElement | null>(null);

  useScrollLock(mounted);
  useEscapeLayer(mounted, onClose);

  // The opener, read when `open` flips true (before the panel mounts), and
  // focused again once the dialog has left.
  useEffect(() => {
    if (open) openedFrom.current = document.activeElement as HTMLElement | null;
  }, [open]);
  useEffect(() => {
    if (!mounted) return;
    return () => {
      const el = openedFrom.current;
      if (el && el.isConnected) el.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  // Move focus in once the panel has entered, unless something inside already
  // has it (an autoFocus input). The panel itself is the fallback, focused
  // without scrolling so a tall dialog never jumps.
  useEffect(() => {
    if (!entered) return;
    const panel = panelRef.current;
    if (!panel || panel.contains(document.activeElement)) return;
    const target = initialFocusRef?.current ?? panel.querySelector<HTMLElement>("[data-autofocus]");
    if (target) target.focus({ preventScroll: true });
    else panel.focus({ preventScroll: true });
  }, [entered, initialFocusRef]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const list = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!list || list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (document.activeElement === panelRef.current) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted || typeof document === "undefined") return null;
  const aria = labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": label };

  // The OVERLAY scrolls, not the panel, inside a dynamic-viewport-height box
  // with safe-area padding, so a phone's browser chrome never hides the ✕.
  return createPortal(
    <div
      className="fixed inset-0 z-overlay h-[100dvh] overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6"
      role="dialog"
      aria-modal="true"
      {...aria}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-base ${entered ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      {/* A click on the empty space around the panel closes it, like the backdrop. */}
      <div
        className="relative flex min-h-full items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={`relative w-full ${SIZE_CLASS[size]} transition-[opacity,transform] ease-out ${
            entered ? "translate-y-0 scale-100 opacity-100 duration-base" : "translate-y-2 scale-[0.98] opacity-0 duration-fast"
          } text-left focus:outline-none ${className}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
