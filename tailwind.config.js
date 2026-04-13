/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bourbon: {
          50:  "#f0f0ff",
          100: "#e0e0ff",
          200: "#c0c4f8",
          300: "#9ca3f0",
          400: "#7c7de8",
          500: "#6060d6",
          600: "#4848c0",
          700: "#2d2b8a",
          800: "#1a1860",
          900: "#0d0c38",
        },
      },
    },
  },
  plugins: [],
};
