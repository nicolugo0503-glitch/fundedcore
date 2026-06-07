import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D11", s1: "#141821", panel: "#141821", panel2: "#1B202B",
        acc: "#5B9CFF", acc2: "#5B9CFF", grn: "#4ADE80", amb: "#FBBF24", red: "#F87171",
        t1: "#E6E9EF", t2: "#97A1B0", t3: "#5C6675",
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
