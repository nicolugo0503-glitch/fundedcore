import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#00020A", s1: "#070C18", panel: "#0B1422", panel2: "#0E1A2C",
        acc: "#7AB8D4", acc2: "#3A7A9A", grn: "#2ADB8A", amb: "#E8B84B", red: "#E85050",
        t1: "#D8ECF5", t2: "#7E9DB5", t3: "#3A556B",
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
