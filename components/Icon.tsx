// Minimal stroke icon set (lucide-style) — replaces all emoji.
const P: Record<string, string> = {
  gauge: "M12 14l3-3M5.6 18a9 9 0 1 1 12.8 0",
  bolt: "M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  chart: "M4 19V5M4 19h16M8 16l3-4 3 2 4-6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 3 4 2.5 2.5 0 0 0 3 1V4.5A2 2 0 0 0 9 4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-3 4 2.5 2.5 0 0 1-3 1V4.5A2 2 0 0 1 15 4z",
  book: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM18 17H6",
  target: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0",
  repeat: "M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3",
  check: "M4 12l5 5L20 6",
  calc: "M6 3h12v18H6zM9 7h6M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9.4A1.6 1.6 0 0 0 11 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9.4a1.6 1.6 0 0 0 1.1 1.6H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  news: "M4 5h16v14H4zM8 9h8M8 13h8M8 17h5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  alert: "M12 9v4M12 17h.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z",
  down: "M12 5v14M19 12l-7 7-7-7",
  up: "M12 19V5M5 12l7-7 7 7",
};
export function Icon({ name, size = 16, className = "", strokeWidth = 1.6 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name] || P.grid} />
    </svg>
  );
}
