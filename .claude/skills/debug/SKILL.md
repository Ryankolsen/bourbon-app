---
name: debug
description: Systematically debug UI and component bugs using code inspection, targeted logging, and regression tests. Use when the user reports a visual glitch, interaction bug, or unexpected behavior and wants to find and fix the root cause. Covers layout bugs, event-handler sequencing issues, state resets, third-party library quirks, and React lifecycle surprises.
---

# Debug

Diagnose a bug systematically: read the code, form a hypothesis, instrument if needed, fix, then lock it in with a regression test.

## Workflow

### 1. Understand the bug

Collect from the user:
- What they expected vs. what actually happened
- Screenshots or screen recordings if it's visual
- Reproduction steps (which screen, which action)

### 2. Read the relevant code

Find and read the component(s) involved. Look for:
- Layout constraints that could cause sizing/overflow issues (missing `flexGrow: 0`, unconstrained `ScrollView`, etc.)
- Event handler order — which callbacks fire and in what sequence
- State that could be reset by a `useEffect` with the wrong dependency
- Third-party component props that might have surprising side effects

### 3. Form a hypothesis before adding logs

State the suspected root cause clearly. If the code reading is sufficient to confirm it, skip straight to the fix. Only instrument when the call order or timing is genuinely ambiguous.

**Examples where code alone is enough:**
- A horizontal `ScrollView` with no height constraint inside a flex container → fix is `style={{ flexGrow: 0 }}`
- A `value` prop change triggering a `useEffect` that resets local state

**Examples where logging is needed:**
- Unclear whether a library callback fires before or after another (e.g. `onBlur` vs `onChange`)
- Uncertain which render cycle is clobbering state

### 4. Add targeted logging (if needed)

Instrument at the key decision points — not everywhere. Standard targets:

```ts
// Component renders
console.log(`[ComponentName] render — value="${value}" localState="${localState}"`);

// useEffect
console.log(`[ComponentName] useEffect — dep="${dep}" isOpen=${isOpenRef.current}`);

// Event handlers
console.log(`[ComponentName] onSelect item="${item.value}"`);
console.log(`[ComponentName] onSearchChange text="${text}" justSelected=${justSelectedRef.current}`);

// Library lifecycle events
console.log(`[ComponentName] onFocus (opened)`);
console.log(`[ComponentName] onBlur (closed)`);
```

Ask the user to reload the app, reproduce the bug, and paste the Metro console output.

### 5. Interpret the logs

Read the sequence carefully. Look for:
- A callback firing in an unexpected order (e.g. library clearing search text *after* selection fires your `onChange`)
- A `useEffect` running with stale state because a ref wasn't updated yet
- A parent re-render passing a new prop that overwrites local state at the wrong time

State the root cause as a single sentence before writing the fix.

### 6. Fix

Make the minimal change. Common patterns from this codebase:

| Symptom | Likely cause | Fix |
|---|---|---|
| Component grows to fill screen when list is empty | `ScrollView` unconstrained in flex parent | `style={{ flexGrow: 0 }}` |
| Selected value disappears after pick | Library fires `onChangeText("")` post-selection, wiping form value | `justSelectedRef` guard — skip empty-string event immediately after selection |
| Selected value disappears after pick | `data` prop empties during loading, Dropdown can't match value | Decouple search query state from form value |
| `useEffect` resets state unexpectedly | `isOpen` ref is false when it should be true | Check library focus/blur event timing with logs |

### 7. Write a regression test

**Always write a test.** The mock must simulate the exact behavior that caused the bug — not a simplified happy path.

```ts
// Good: mock fires onChangeText("") after onChange, exactly like the real library
onPress={() => {
  onChange(item);
  onChangeText?.('');   // ← the quirk we're guarding against
  onBlur?.();
}}

// Bad: mock only calls onChange — doesn't reproduce the bug
onPress={() => onChange(item)}
```

Test checklist:
- [ ] One test that would have caught this bug before the fix
- [ ] One test for the happy path (normal selection works)
- [ ] One test per edge case introduced by the fix (e.g. free-text fallback still works)

Run `pnpm run typecheck && pnpm run test` — all must pass.

### 8. Remove logging and commit

Strip every `console.log` added in step 4. Then commit with a message that covers:
1. What the symptom was
2. The root cause (one sentence)
3. What the fix does

```
Fix [component] [symptom]

Root cause: [one sentence].
Fix: [what changed and why].
Adds regression test for [specific behavior].
```