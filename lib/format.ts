export const usd = (n: number, cents = false) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
export const num = (n: number, d = 2) => n.toFixed(d);

export const DECISION_META: Record<
  string,
  { label: string; color: string; bg: string; sub: string }
> = {
  FUNDED: { label: "Funded", color: "#10B981", bg: "rgba(16,185,129,.12)", sub: "Capital allocated" },
  CONDITIONAL: { label: "Conditional", color: "#F59E0B", bg: "rgba(245,158,11,.12)", sub: "Ramp offer" },
  DECLINED: { label: "Not funded", color: "#EF4444", bg: "rgba(239,68,68,.12)", sub: "Edge unproven" },
};

export function scoreColor(s: number): string {
  if (s >= 78) return "#10B981";
  if (s >= 62) return "#F59E0B";
  if (s >= 48) return "#FB923C";
  return "#EF4444";
}
