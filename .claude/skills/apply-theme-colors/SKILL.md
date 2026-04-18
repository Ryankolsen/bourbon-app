---
name: apply-theme-colors
description: Apply colors correctly in BourbonVault using the two-layer theme system (Tailwind CSS vars + lib/colors.ts). Use when adding UI, fixing contrast issues, choosing a color token, styling a TextInput placeholder, Dropdown, or any imperative style prop, or when the user reports a color that looks wrong across themes.
---

# Apply Theme Colors

Two layers — pick the right one before writing any color value.

## Layer 1 — Tailwind classes (default)

CSS vars set by `ThemeProvider` at runtime. Use for everything that accepts a class.

```tsx
<View className="bg-brand-800"><Text className="text-brand-100">Label</Text></View>
```

| Token | Role |
|---|---|
| `brand-900` / `brand-800` | Page bg / card bg |
| `brand-700` | Input fields, secondary button bg |
| `brand-600` | Primary action button bg (always pair with `text-white`) |
| `brand-100` | Primary text |
| `surface-text` | Text **on brand-700** surfaces — Edit, Find, disabled buttons |
| `placeholder-dark` | Form input placeholder text |
| `placeholder-group` | Group-screen input placeholder text |

**Never use `text-brand-600` as text on `bg-brand-700`** — they are too similar in dark themes. Use `text-surface-text` instead.

## Layer 2 — `lib/colors.ts` (imperative props only)

For props that can't accept Tailwind classes: `placeholderTextColor`, `ActivityIndicator color`, dropdown `style` objects, tab bar config.

```tsx
import { colors } from "@/lib/colors";
<TextInput placeholderTextColor={colors.placeholderDark} ... />
<ActivityIndicator color={colors.spinnerDefault} />
```

`lib/colors.ts` mirrors the **Charcoal (default dark)** theme. Never define module-level style constants from `colors.*` — build them inline inside the component so values are read at render time.

**Never use raw hex strings in components.**

## Adding a new token

1. Add to `ThemeColors` type in `lib/themes.ts`
2. Set value in all three themes (`charcoal`, `highContrast`, `navyFlax`)
3. Add to `themeColorsToCssVars()` and `tailwind.config.js`
4. Mirror the Charcoal value in `lib/colors.ts`