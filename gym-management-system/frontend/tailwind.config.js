/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf3",
          100: "#d6fbe2",
          200: "#aff5c8",
          300: "#75eba5",
          400: "#3bd97e",
          500: "#16bd60",
          600: "#0c9a4d",
          700: "#0d7a41",
          800: "#0e6136",
          900: "#0d502f",
          950: "#022c18",
        },
        ink: {
          900: "#0f1115",
          800: "#161a20",
          700: "#1e232b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
