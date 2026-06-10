"use client";
import { useEffect } from "react";
// Progressive-enhancement scroll choreography: sections rise + fade in as they
// enter. Applied via JS so no-JS still shows everything. Skips the hero.
export function RevealOnScroll() {
  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>(".lp main > section")).slice(1);
    if (!("IntersectionObserver" in window) || !secs.length) return;
    secs.forEach((s) => s.classList.add("rv"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return null;
}
