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
          50:  "#fdf8f0",
          100: "#faefd9",
          200: "#f4d9a8",
          300: "#ecbe6d",
          400: "#e39e38",
          500: "#d4821e",
          600: "#b86316",
          700: "#964b16",
          800: "#7a3c19",
          900: "#643317",
        },
      },
    },
  },
  plugins: [],
};
