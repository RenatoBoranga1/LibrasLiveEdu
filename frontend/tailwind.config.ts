import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#10201c",
        ocean: "#0f766e",
        mint: "#d9f99d",
        paper: "#f8faf7",
        amber: "#f59e0b",
        coral: "#f97316"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(16, 32, 28, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
