"use client";
import { useEffect, useRef } from "react";

// Mouse-reactive constellation drifting behind the app. Accent-tinted, subtle.
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current!; const ctx = cv.getContext("2d")!;
    let w = 0, h = 0, raf = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };
    type P = { x: number; y: number; vx: number; vy: number };
    let pts: P[] = [];

    function resize() {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(70, Math.floor((w * h) / 22000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 }));
    }
    function accent() {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#10A37F";
      return v;
    }
    function hexToRgb(hex: string) { const m = hex.replace("#", ""); const b = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16); return [(b >> 16) & 255, (b >> 8) & 255, b & 255]; }

    function tick() {
      const [r, g, b] = hexToRgb(accent());
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        // gentle mouse attraction
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 26000) { p.vx += dx / d2 * 6; p.vy += dy / d2 * 6; }
        p.vx = Math.max(-0.9, Math.min(0.9, p.vx)); p.vy = Math.max(-0.9, Math.min(0.9, p.vy));
      }
      // links
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], c = pts[j];
          const dx = a.x - c.x, dy = a.y - c.y, dist = Math.hypot(dx, dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - dist / 130) * 0.16})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
          }
        }
      }
      // nodes
      for (const p of pts) {
        ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    resize(); tick();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseout", onLeave); };
  }, []);
  return <canvas ref={ref} className="particles" aria-hidden />;
}
