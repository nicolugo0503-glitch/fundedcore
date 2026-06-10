"use client";
import { useEffect } from "react";
// The landing is always dark-institutional, regardless of the user's suite theme.
// Forces dark on mount; restores their saved theme when they navigate away.
export function ForceDark() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme") || "light";
    root.setAttribute("data-theme", "dark");
    return () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("fc-theme"); } catch {}
      root.setAttribute("data-theme", saved || prev);
    };
  }, []);
  return null;
}
