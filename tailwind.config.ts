import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF", s1: "#141821", panel: "#FFFFFF", panel2: "#F7F7F8",
        acc: "#10A37F", acc2: "#5B9CFF", grn: "#16A34A", amb: "#D97706", red: "#DC2626",
        t1: "#0D0D0D", t2: "#565869", t3: "#8E8EA0",
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
