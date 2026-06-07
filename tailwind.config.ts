import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0A09", s1: "#131210", panel: "#131210", panel2: "#1A1815",
        acc: "#C8A96A", acc2: "#C8A96A", grn: "#6BBF8A", amb: "#D9B45B", red: "#D98873",
        t1: "#EFEAE1", t2: "#A39C8E", t3: "#6B655A",
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
