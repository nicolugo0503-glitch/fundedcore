import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#020817", s1: "#0D1B33", panel: "#0A1628", panel2: "#0F2240",
        acc: "#3B82F6", acc2: "#1D4ED8", grn: "#10B981", amb: "#F59E0B", red: "#EF4444",
        t1: "#F0F4FF", t2: "#94A3B8", t3: "#475569",
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
