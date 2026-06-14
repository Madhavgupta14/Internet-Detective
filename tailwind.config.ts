import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        paper: "#F4F6FB",
        moss: "#15803D",
        brass: "#B45309",
        signal: "#2563EB",
        clay: "#DC2626",
        brand: {
          50: "#EFF5FF",
          100: "#DBE8FE",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          900: "#1E3A8A"
        }
      },
      borderRadius: {
        xl: "0.9rem"
      },
      boxShadow: {
        panel: "0 12px 32px -14px rgba(30, 58, 138, 0.30)",
        soft: "0 1px 2px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
