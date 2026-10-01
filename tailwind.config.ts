import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: "#FFFCF7",
          100: "#FFF8F0",
          200: "#F5EFE0",
          300: "#EDE0C8",
          400: "#DEC9A0",
        },
        bark: {
          50: "#F9F4EE",
          100: "#EFE3D4",
          200: "#D9BFA0",
          300: "#B8916A",
          400: "#8B6340",
          500: "#6B4A2A",
          600: "#5C3A1E",
          700: "#4A2D15",
          800: "#3A220F",
          900: "#2C1A0A",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        serif: ["Georgia", "Cambria", "serif"],
      },
      backgroundImage: {
        "parchment-grain":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23FFF8F0'/%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23EDE0C8' opacity='0.4'/%3E%3Ccircle cx='3' cy='3' r='0.5' fill='%23EDE0C8' opacity='0.4'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
