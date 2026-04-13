---
name: prd-to-plan
description: Turn a PRD into a multi-phase implementation plan using tracer-bullet vertical slices, submitted as a GitHub issue. Use when user wants to break down a PRD, create an implementation plan, plan phases from a PRD, or mentions "tracer bullets".
---

# PRD to Plan

Break a PRD into a phased implementation plan using vertical slices (tracer bullets). Output is submitted as a **GitHub issue** linked back to the source PRD issue.

## Process

### 1. Confirm the PRD is in context

The PRD should already be in the conversation. If it isn't, ask the user to paste it or point you to the file.

### 2. Explore the codebase

If you have not already explored the codebase, do so to understand the current architecture, existing patterns, and integration layers.

### 3. Identify durable architectural decisions

Before slicing, identify high-level decisions that are unlikely to change throughout implementation:

- Route structures / URL patterns
- Database schema shape
- Key data models
- Authentication / authorization approach
- Third-party service boundaries

These go in the plan header so every phase can reference them.

### 4. Draft vertical slices

Break the PRD into **tracer bullet** phases. Each phase is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

**Every phase MUST follow red-green-refactor order:**
1. **Red** — Write failing tests first that define the behavior of the new slice
2. **Green** — Implement the minimum code to make those tests pass
3. **Refactor** — Clean up without changing behavior, keeping tests green

This is non-negotiable. Tests are never written after the implementation. A phase that skips the test step is not a valid phase.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- Each slice begins with failing tests (red) before any production code is written
- Tests define the behavior contract for the slice — implementation follows the tests, not the other way around
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones — a slice that takes more than a few hours is too thick
- Do NOT include specific file names, function names, or implementation details that are likely to change as later phases are built
- DO include durable decisions: route paths, schema shapes, data model names
- The first slice should be the thinnest possible end-to-end path ("walking skeleton") — just enough to prove all layers connect
</vertical-slice-rules>

### 5. Quiz the user

Present the proposed breakdown as a numbered list. For each phase show:

- **Title**: short descriptive name
- **Red step**: what failing tests will be written first
- **Green step**: what implementation makes those tests pass
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the red-green-refactor ordering feel right for each phase?
- Does the granularity feel right? (too coarse / too fine)
- Should any phases be merged or split further?

Iterate until the user approves the breakdown.

### 6. Submit the plan as a GitHub issue

Submit the plan as a GitHub issue using `gh issue create`. Title the issue `Plan: {Feature Name}`. Link back to the source PRD issue in the body. Use the template below.

<plan-template>
# Plan: {Feature Name}

> Source PRD: {brief identifier or link}

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: ...
- **Schema**: ...
- **Key models**: ...
- (add/remove sections as appropriate)

---

## Phase 1: {Title}

**User stories**: {list from PRD}

### Red — Write failing tests first

Describe the specific failing tests to write before touching production code. Tests should be ordered from thinnest to widest (core wiring first, edge cases last):

1. {Test description — what behavior it asserts}
2. {Test description}
3. {Test description}

### Green — Implement to pass

A concise description of the minimum implementation needed to make the tests above pass. Describe end-to-end behavior, not layer-by-layer details.

### Refactor

Note any cleanup or structural improvements to make once the tests are green, without changing behavior.

### Acceptance criteria

- [ ] All tests from the Red step are passing
- [ ] Criterion 2
- [ ] Criterion 3

---

## Phase 2: {Title}

**User stories**: {list from PRD}

### Red — Write failing tests first

1. {Test description}
2. {Test description}

### Green — Implement to pass

...

### Refactor

...

### Acceptance criteria

- [ ] All tests from the Red step are passing
- [ ] ...

(Repeat for each phase)
</plan-template>
