"use client";
import { useEffect } from "react";

// One pointer listener drives: card spotlight, 3D card tilt, magnetic buttons.
export function CardSpotlight() {
  useEffect(() => {
    if (window.matchMedia?.("(pointer: coarse)").matches) return; // skip on touch
    let curTilt: HTMLElement | null = null;
    let curBtn: HTMLElement | null = null;

    const move = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const card = el?.closest?.(".card") as HTMLElement | null;

      // spotlight + tilt
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
        if (card.classList.contains("card-hover")) {
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateY(${px * 4.2}deg) rotateX(${-py * 4.2}deg) translateY(-2px)`;
          if (curTilt && curTilt !== card) curTilt.style.transform = "";
          curTilt = card;
        } else if (curTilt) { curTilt.style.transform = ""; curTilt = null; }
      } else if (curTilt) { curTilt.style.transform = ""; curTilt = null; }

      // magnetic buttons
      const btn = el?.closest?.(".btn") as HTMLElement | null;
      if (btn) {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${mx * 0.22}px, ${my * 0.32}px)`;
        curBtn = btn;
      } else if (curBtn) { curBtn.style.transform = ""; curBtn = null; }
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return null;
}
