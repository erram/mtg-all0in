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
      boxShadow: {
        // Warm-tinted elevation scale — shadows lean brown, not gray
        'card': '0 1px 2px rgba(28, 22, 18, 0.04), 0 2px 8px rgba(28, 22, 18, 0.04)',
        'card-hover': '0 2px 4px rgba(28, 22, 18, 0.05), 0 8px 24px rgba(28, 22, 18, 0.10)',
        'float': '0 4px 12px rgba(28, 22, 18, 0.06), 0 16px 40px rgba(28, 22, 18, 0.12)',
        'glow-accent': '0 0 0 1px rgba(217, 119, 86, 0.25), 0 4px 20px rgba(217, 119, 86, 0.25)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'bar-grow': {
          from: { width: '0%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.5s linear infinite',
        'bar-grow': 'bar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
