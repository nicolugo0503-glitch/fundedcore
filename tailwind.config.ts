import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0B0D", s1: "#121419", panel: "#121419", panel2: "#181B21",
        acc: "#6E8BFF", acc2: "#6E8BFF", grn: "#3FB950", amb: "#D29922", red: "#F85149",
        t1: "#E8EAED", t2: "#9AA0AA", t3: "#626974",
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
