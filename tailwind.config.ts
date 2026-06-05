import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#05070F", s1: "#111827", panel: "#0B1220", panel2: "#101A2E",
        acc: "#5B8CFF", acc2: "#8B5CF6", grn: "#34D399", amb: "#FBBF24", red: "#F87171",
        t1: "#F4F7FF", t2: "#8B9AB8", t3: "#64748B",
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
