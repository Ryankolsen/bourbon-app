---
status: accepted
---

# Tap targets use the shared accessible pressable

An accessibility audit found almost no tap target in the app carried a role or label, so screen-reader users heard bare emoji or nothing. Every tap target now goes through one shared pressable component that defaults its role to button and requires a label, and ESLint's `no-restricted-imports` bans importing `TouchableOpacity`, `Pressable` and the other `Touchable*` primitives anywhere else. Adding the props in place on each control was rejected because nothing would stop the next screen repeating the gap; `eslint-plugin-react-native-a11y` was rejected as poorly maintained and noisy.
