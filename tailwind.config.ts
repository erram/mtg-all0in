import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50:  "#FAF9F7",
          100: "#F5F2EE",
          200: "#EDE8E1",
          300: "#E0D9CF",
          400: "#C9BFB3",
          500: "#A39A90",
          600: "#6B635A",
          700: "#4A4440",
          800: "#2D2926",
          900: "#1C1612",
        },
        accent: {
          50:  "#FDF0EB",
          100: "#FAE0D5",
          200: "#F5C1A9",
          300: "#EFA17D",
          400: "#E88159",
          500: "#D97756",
          600: "#C4633F",
          700: "#A34F30",
          800: "#7D3C23",
          900: "#5C2C18",
        },
      },
    },
  },
  plugins: [],
};
export default config;
