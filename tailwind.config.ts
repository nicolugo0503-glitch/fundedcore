import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F9FC", s1: "#EEF1F8", panel: "#FFFFFF", panel2: "#E8EDF8",
        acc: "#1648CC", acc2: "#0F2680", grn: "#059669", amb: "#B45309", red: "#DC2626",
        t1: "#040D1E", t2: "#475569", t3: "#94A3B8",
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
