---
name: apply-theme-colors
description: Apply colors correctly in BourbonVault using the two-layer theme system (Tailwind CSS vars + lib/colors.ts). Use when adding UI, fixing contrast issues, choosing a color token, styling a TextInput placeholder, Dropdown, or any imperative style prop, or when the user reports a color that looks wrong across themes.
---

# Apply Theme Colors

BourbonVault uses a two-layer color system. Always identify which layer applies before writing any color value.

## The two layers

| Layer | File | Used for | Example |
|---|---|---|---|
| Tailwind CSS vars | `lib/themes.ts` → `tailwind.config.js` | Tailwind class-based styling | `className="bg-brand-800 text-brand-100"` |
| JS constants | `lib/colors.ts` | Imperative style props that can't use classes | `placeholderTextColor={colors.placeholderDark}` |

**Never use raw hex strings in components.** Never import from `lib/themes.ts` directly in a component.

---

## Layer 1 — Tailwind classes (default path)

Use `brand-*` and semantic tokens as Tailwind classes. They resolve via CSS custom properties set by `ThemeProvider` at runtime.

```tsx
// ✅ Correct
<View className="bg-brand-800 rounded-xl">
  <Text className="text-brand-100 font-semibold">Label</Text>
</View>

// ❌ Wrong — raw hex
<View style={{ backgroundColor: "#1a1a1a" }}>
```

### Token roles (read `lib/themes.ts` header before picking)

| Token | Role |
|---|---|
| `brand-900` | Page / screen background |
| `brand-800` | Card / elevated surface |
| `brand-700` | Button bg, input field bg, chips |
| `brand-600` | Vivid accent — active chips, primary action buttons |
| `brand-400` | Secondary text |
| `brand-300` | Button text on brand-700 bg; secondary card labels |
| `brand-100` | Primary text |
| `surface-text` | **Text on brand-700 surfaces** (buttons, Find, Edit labels) — use this instead of hard-coding brand-200/300 |
| `placeholder-group` | Placeholder text in group-screen inputs |
| `placeholder-dark` | Placeholder text in standard form inputs |
| `placeholder-muted` | Placeholder text in profile / muted inputs |

### Active vs disabled button pattern

```tsx
// Active: bg-brand-600 + text-white
// Disabled: bg-brand-700 + text-surface-text  ← not text-brand-600
<TouchableOpacity
  className={foundProfile ? "bg-brand-600" : "bg-brand-700"}
>
  <Text className={foundProfile ? "text-white" : "text-surface-text"}>
    Send Invite
  </Text>
</TouchableOpacity>
```

---

## Layer 2 — `lib/colors.ts` (imperative props only)

Use `colors.*` for props that cannot accept Tailwind classes:
- `TextInput` → `placeholderTextColor`
- `ActivityIndicator` → `color`
- `react-native-element-dropdown` → `style`, `placeholderStyle`, `selectedTextStyle`, etc.
- Tab bar / navigation config
- Sliders, switches

```tsx
import { colors } from "@/lib/colors";

<TextInput
  placeholderTextColor={colors.placeholderDark}
  className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3"
/>

<ActivityIndicator color={colors.spinnerDefault} />
```

`lib/colors.ts` mirrors the **Charcoal (default dark)** theme. When adding a new key, add the matching entry to all three themes in `lib/themes.ts` first, then update `lib/colors.ts` to match the Charcoal value.

### Dropdown components

Dropdowns from `react-native-element-dropdown` use all imperative styles — build them inline from `colors.*`:

```tsx
<Dropdown
  style={{ backgroundColor: colors.brand800, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4 }}
  placeholderStyle={{ color: colors.placeholderDark, fontSize: 16 }}
  selectedTextStyle={{ color: colors.brand100, fontSize: 16 }}
  containerStyle={{ backgroundColor: colors.brand800, borderRadius: 12, borderColor: colors.brand700 }}
  itemTextStyle={{ color: colors.brand100, fontSize: 14 }}
/>
```

Do **not** define these as module-level constants — that freezes the values at import time and breaks theme switching.

---

## Adding a new semantic token

1. Add the key + type to `ThemeColors` in `lib/themes.ts`
2. Set the value in all three themes: `charcoal`, `highContrast`, `navyFlax`
3. Add `"--token-name": c.tokenName` to `themeColorsToCssVars()`
4. Add `"token-name": "var(--token-name)"` to `tailwind.config.js`
5. Mirror the Charcoal value in `lib/colors.ts`

---

## Contrast checklist before shipping

- Text on `brand-700` bg → use `text-surface-text` (pre-verified per theme)
- Placeholder text on `brand-800` bg → use `colors.placeholderDark` (≥4:1 in Charcoal)
- Placeholder text on `brand-700` bg (group inputs) → use `colors.placeholderGroup` (≥3:1 in Charcoal)
- Active button text on `brand-600` bg → always `text-white`
- Never use `text-brand-600` as text on `bg-brand-700` — they are too similar in dark themes