import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#142a3b",
        ocean: "#075e66",
        sky: "#dceef4",
        mint: "#cbeedd",
        "mint-strong": "#59d4c2",
        paper: "#f7fafc",
        amber: "#f8e7bd",
        "amber-strong": "#c87916",
        coral: "#d96a4b"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(20, 42, 59, 0.09)",
        elevated: "0 22px 55px rgba(20, 42, 59, 0.14)"
      },
      fontFamily: {
        sans: ["Inter", "Aptos", "Segoe UI", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
