import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", s1: "#141821", panel: "var(--panel)", panel2: "var(--panel2)",
        acc: "var(--acc)", acc2: "#5B9CFF", grn: "var(--grn)", amb: "var(--amb)", red: "var(--red)",
        t1: "var(--t1)", t2: "var(--t2)", t3: "var(--t3)",
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
