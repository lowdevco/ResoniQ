/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand-color)",
          hover: "var(--brand-color-hover)",
          glow: "var(--brand-color-glow)",
        }
      }
    },
  },
  plugins: [],
}
