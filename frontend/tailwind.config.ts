import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#111827",
        card: "#1F2937",
        primary: "#3B82F6",
        accent: "#8B5CF6",
      },
    },
  },
  plugins: [],
};
export default config;
