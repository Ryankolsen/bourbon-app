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
        brand: {
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
        // Semantic tokens — tab bar / header
        "tab-bar":        "#0d0a2e",
        "tab-border":     "#2a1f6e",
        "tab-active":     "#818cf8",
        "tab-inactive":   "#4a4580",
        "header-tint":    "#e0e7ff",
        // Semantic tokens — feedback / alerts
        "badge-error":    "#dc2626",
        "toast-success":  "#4848c0",
        "toast-error":    "#b91c1c",
        "toast-action":   "#c8c8e8",
        "error-default":  "#ef4444",
        // Semantic tokens — sliders / toggles
        "slider-thumb":         "#e39e38",
        "slider-track-filled":  "#c47b2a",
        "slider-track-empty":   "#3a2a1a",
        // Semantic tokens — accent / misc
        "accent-amber":         "#f59e0b",
        "spinner-default":      "#e39e38",
        "spinner-amber":        "#c8a96e",
        // Semantic tokens — input placeholders
        "placeholder-dark":     "#7a3c19",
        "placeholder-muted":    "#6b5c45",
        "placeholder-group":    "#7c6a50",
        "placeholder-search":   "#5a5a9a",
        // Semantic tokens — picker overlay
        "picker-bg":     "#0f0e4a",
        "picker-border": "#2d2b8a",
      },
    },
  },
  plugins: [],
};
