"use client";
import { useEffect } from "react";
export function CardSpotlight() {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = (e.target as HTMLElement)?.closest?.(".card") as HTMLElement | null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("mousemove", h, { passive: true });
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return null;
}
