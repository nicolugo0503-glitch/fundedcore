"use client";
import { useEffect, useRef } from "react";
import { equitySeries, fmtMoney, type Trade } from "@/lib/engine";

export default function EquityChart({ trades }: { trades: Trade[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const { A, B } = equitySeries(trades);
    if (!A.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 600, h = 240;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + "px";
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const all = A.concat(B);
    const min = Math.min(0, ...all), max = Math.max(0, ...all);
    const padL = 56, padR = 16, padT = 14, padB = 22;
    const X = (i: number) => padL + (i / (A.length - 1)) * (w - padL - padR);
    const Y = (v: number) => padT + (1 - (v - min) / ((max - min) || 1)) * (h - padT - padB);
    ctx.strokeStyle = "rgba(120,160,185,.08)"; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const yy = padT + (g / 4) * (h - padT - padB);
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      const val = max - (g / 4) * (max - min);
      ctx.fillStyle = "rgba(126,157,181,.5)"; ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText("$" + Math.round(val / 1000) + "k", padL - 8, yy + 3);
    }
    if (min < 0 && max > 0) {
      ctx.strokeStyle = "rgba(232,80,80,.25)"; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(w - padR, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    }
    const line = (arr: number[], color: string, fill: string | null) => {
      ctx.beginPath(); arr.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
      if (fill) {
        ctx.lineTo(X(arr.length - 1), Y(min)); ctx.lineTo(X(0), Y(min)); ctx.closePath();
        const g = ctx.createLinearGradient(0, padT, 0, h); g.addColorStop(0, fill); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fill();
      }
    };
    line(B, "#2ADB8A", "rgba(42,219,138,.08)");
    line(A, "#7E9DB5", null);
    ctx.font = "600 11px monospace"; ctx.textAlign = "left";
    ctx.fillStyle = "#2ADB8A"; ctx.fillText(fmtMoney(B[B.length - 1]), X(B.length - 1) - 46, Y(B[B.length - 1]) - 8);
    ctx.fillStyle = "#7E9DB5"; ctx.fillText(fmtMoney(A[A.length - 1]), X(A.length - 1) - 46, Y(A[A.length - 1]) + 16);
  }, [trades]);
  return <canvas ref={ref} className="w-full" style={{ display: "block" }} />;
}
