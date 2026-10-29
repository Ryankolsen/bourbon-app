---
status: accepted
---

# Text inputs use the shared labeled input

The accessibility audit found text inputs named only by their placeholder, visible labels never linked to their input, and validation errors that were shown but never announced. Every text input now goes through one shared labeled input that requires a label (visually hidden where the design shows none), takes an optional error, marks itself invalid and announces a new error; ESLint's `no-restricted-imports` bans importing `TextInput` anywhere else. Adding `accessibilityLabel` in place on each input was rejected for the same reason as in ADR-0001: nothing would stop the next form repeating the gap.
