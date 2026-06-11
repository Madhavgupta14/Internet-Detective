import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        paper: "#F7F8F5",
        moss: "#4F6F52",
        brass: "#B8860B",
        signal: "#116466",
        clay: "#B65B3A"
      },
      boxShadow: {
        panel: "0 8px 24px rgba(23, 32, 42, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
