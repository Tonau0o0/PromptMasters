import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          50: "#f5f5f7",
          900: "#0b0b0f",
          950: "#070709",
        },
        neural: {
          core: "#a855f7",
          data: "#22d3ee",
          feature: "#f59e0b",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(168, 85, 247, 0.45)",
        "glow-data": "0 0 18px rgba(34, 211, 238, 0.45)",
        "glow-feature": "0 0 18px rgba(245, 158, 11, 0.45)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
