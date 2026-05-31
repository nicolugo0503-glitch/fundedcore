"use client";
import { useEffect, useRef } from "react";
import type { MonteCarloResult } from "@/lib/engine";

export default function MonteCarloChart({
  result,
  trailingDD,
}: {
  result: MonteCarloResult;
  trailingDD: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const { paths, p10, p25, p50, p75, p90, nTrades } = result;
    if (!nTrades || !p50.length) return;

    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 700;
    const h = 280;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.height = h + "px";
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Compute value range
    const allVals = [...p10, ...p90];
    const rawMin = Math.min(...allVals, -trailingDD * 1.05);
    const rawMax = Math.max(...allVals, 0);
    const pad = (rawMax - rawMin) * 0.06;
    const minV = rawMin - pad;
    const maxV = rawMax + pad;

    const PAD_L = 58, PAD_R = 18, PAD_T = 16, PAD_B = 30;
    const X = (i: number) => PAD_L + (i / Math.max(1, nTrades - 1)) * (w - PAD_L - PAD_R);
    const Y = (v: number) => PAD_T + (1 - (v - minV) / (maxV - minV)) * (h - PAD_T - PAD_B);

    // Grid lines
    for (let g = 0; g <= 4; g++) {
      const yy = PAD_T + (g / 4) * (h - PAD_T - PAD_B);
      ctx.beginPath();
      ctx.moveTo(PAD_L, yy);
      ctx.lineTo(w - PAD_R, yy);
      ctx.strokeStyle = "rgba(120,160,185,.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const val = maxV - (g / 4) * (maxV - minV);
      ctx.fillStyle = "rgba(126,157,181,.4)";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        (val >= 0 ? "+$" : "-$") + Math.abs(Math.round(val / 1000)) + "k",
        PAD_L - 6,
        yy + 3
      );
    }

    // Zero line
    ctx.save();
    ctx.strokeStyle = "rgba(42,219,138,.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(PAD_L, Y(0));
    ctx.lineTo(w - PAD_R, Y(0));
    ctx.stroke();
    ctx.fillStyle = "rgba(42,219,138,.45)";
    ctx.font = "bold 8px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText("BREAKEVEN", PAD_L + 4, Y(0) - 4);
    ctx.restore();

    // Blow threshold line
    ctx.save();
    ctx.strokeStyle = "rgba(232,80,80,.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    const blowY = Y(-trailingDD);
    ctx.beginPath();
    ctx.moveTo(PAD_L, blowY);
    ctx.lineTo(w - PAD_R, blowY);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,80,80,.65)";
    ctx.font = "bold 8px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText("▼ BLOW", w - PAD_R, blowY - 4);
    ctx.restore();

    // Helper: draw a polyline
    const polyline = (arr: number[]) => {
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = X(i), y = Y(v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
    };

    // Individual sample paths (very light)
    for (const path of paths) {
      polyline(path);
      ctx.strokeStyle = "rgba(122,184,212,.07)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    // Band P10–P90 (wide, faint)
    ctx.beginPath();
    p90.forEach((v, i) => { const x = X(i), y = Y(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    for (let i = nTrades - 1; i >= 0; i--) ctx.lineTo(X(i), Y(p10[i]));
    ctx.closePath();
    ctx.fillStyle = "rgba(122,184,212,.05)";
    ctx.fill();

    // Band P25–P75 (narrower, visible)
    ctx.beginPath();
    p75.forEach((v, i) => { const x = X(i), y = Y(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    for (let i = nTrades - 1; i >= 0; i--) ctx.lineTo(X(i), Y(p25[i]));
    ctx.closePath();
    ctx.fillStyle = "rgba(122,184,212,.12)";
    ctx.fill();

    // P50 median (solid accent line)
    polyline(p50);
    ctx.strokeStyle = "#7AB8D4";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.stroke();

    // Median end label
    const lastX = X(nTrades - 1);
    const lastY = Y(p50[nTrades - 1]);
    const lastVal = p50[nTrades - 1];
    ctx.font = "bold 9px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#7AB8D4";
    ctx.fillText(
      "P50 " + (lastVal >= 0 ? "+" : "") + "$" + Math.round(lastVal / 1000) + "k",
      lastX + 4,
      lastY + 4
    );

    // X axis trade count labels
    ctx.fillStyle = "rgba(126,157,181,.35)";
    ctx.font = "8px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      const tIdx = Math.round((i / 4) * (nTrades - 1));
      ctx.fillText("T" + tIdx, X(tIdx), h - PAD_B + 14);
    }
  }, [result, trailingDD]);

  return (
    <canvas
      ref={ref}
      className="w-full"
      style={{ display: "block" }}
    />
  );
}
