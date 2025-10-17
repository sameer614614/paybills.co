/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
        sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1d4ed8",
          light: "#3b82f6",
          dark: "#1e3a8a",
        },
        accent: "#f59e0b",
      },
      backgroundImage: {
        "hero-pattern": "radial-gradient(circle at top, rgba(37, 99, 235, 0.15), transparent 60%)",
      },
    },
  },
  plugins: [],
}
