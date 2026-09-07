---
name: verify
description: Run this project's full pre-commit gate. Use when the user wants to verify a change is ready to commit, asks whether everything passes, or is about to commit or open a pull request.
domain: verification
disable-model-invocation: false
---

# Verify

This repository's implementation of the `verify` reserved skill name. The full gate, run once before committing. For the fast tests-only call, invoke the project's `run-tests` skill.

## Command

```
npm run typecheck && npm run test
```

Detected from package.json scripts and package-lock.json. If that is wrong, edit this file — it is the
one place this project states how it runs its checks.
