import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F8FAFC", s1: "#F1F5F9", panel: "#FFFFFF", panel2: "#EEF2F7",
        acc: "#0369A1", acc2: "#0C4A6E", grn: "#059669", amb: "#B45309", red: "#DC2626",
        t1: "#0F172A", t2: "#475569", t3: "#94A3B8",
      },
      fontFamily: {
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
