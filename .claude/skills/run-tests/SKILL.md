---
name: run-tests
description: Run this project's test suite and nothing else. Use when the user wants to run tests, check whether tests pass, verify a fix, or when a red-green loop needs a fast tests-only signal.
domain: test-execution
disable-model-invocation: false
---

# Run Tests

This repository's implementation of the `run-tests` reserved skill name. Tests only — no lint, no typecheck, no build — so it is safe to call on every red-green cycle.

## Command

```
npm run test
```

Detected from package.json scripts and package-lock.json. If that is wrong, edit this file — it is the
one place this project states how it runs its checks.
