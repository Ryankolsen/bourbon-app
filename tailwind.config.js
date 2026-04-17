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
        // Brand palette — resolved at runtime via CSS custom properties
        // set by ThemeProvider (lib/theme-provider.tsx).
        brand: {
          50:  "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        // Semantic tokens — tab bar / header
        "tab-bar":       "var(--tab-bar)",
        "tab-border":    "var(--tab-border)",
        "tab-active":    "var(--tab-active)",
        "tab-inactive":  "var(--tab-inactive)",
        "header-tint":   "var(--header-tint)",
        // Semantic tokens — feedback / alerts
        "badge-error":    "var(--badge-error)",
        "toast-success":  "var(--toast-success)",
        "toast-error":    "var(--toast-error)",
        "toast-action":   "var(--toast-action)",
        "error-default":  "var(--error-default)",
        // Semantic tokens — sliders / toggles
        "slider-thumb":         "var(--slider-thumb)",
        "slider-track-filled":  "var(--slider-track-filled)",
        "slider-track-empty":   "var(--slider-track-empty)",
        // Semantic tokens — accent / misc
        "accent-amber":         "var(--accent-amber)",
        "spinner-default":      "var(--spinner-default)",
        "spinner-amber":        "var(--spinner-amber)",
        // Semantic tokens — input placeholders
        "placeholder-dark":     "var(--placeholder-dark)",
        "placeholder-muted":    "var(--placeholder-muted)",
        "placeholder-group":    "var(--placeholder-group)",
        "placeholder-search":   "var(--placeholder-search)",
        // Readable text/label color for interactive elements on brand-700 surfaces
        "surface-text":         "var(--surface-text)",
        // Semantic tokens — picker overlay
        "picker-bg":     "var(--picker-bg)",
        "picker-border": "var(--picker-border)",
      },
    },
  },
  plugins: [],
};
