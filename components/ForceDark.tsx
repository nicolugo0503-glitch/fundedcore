"use client";
import { useEffect } from "react";
// The landing renders in the light institutional theme regardless of suite theme.
export function ForceDark() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme") || "light";
    root.setAttribute("data-theme", "light");
    return () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("fc-theme"); } catch {}
      root.setAttribute("data-theme", saved || prev);
    };
  }, []);
  return null;
}
