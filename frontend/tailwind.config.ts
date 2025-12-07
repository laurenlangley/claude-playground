import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // HealthOps color palette
        primary: {
          DEFAULT: "#F8F9FA",
          dark: "#1A1A1A",
        },
        accent: {
          green: "#39FF14",
          blue: "#7DF9FF",
          pink: "#FF1493",
        },
      },
    },
  },
  plugins: [],
};
export default config;
