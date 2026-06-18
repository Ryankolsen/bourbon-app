# GITHUB REPO

The GitHub repo name is provided at start of context. You MUST use `--repo <repo>` with ALL `gh` commands (issue view, issue close, issue comment, etc.). Never run `gh` commands without `--repo` — the sandbox may resolve to the wrong repository otherwise.

# ISSUES

GitHub issues are provided at start of context. Parse it to get open issues with their bodies and comments.

You will work on the AFK issues only, not the HITL ones.

You've also been passed a file containing the last few commits. Review these to understand what work has been done.

If all AFK tasks are complete, output <promise>NO MORE TASKS</promise>.

# TASK SELECTION

Pick the next task. Prioritize tasks in this order:

1. Critical bugfixes
2. Development infrastructure

Getting development infrastructure like tests and types and dev scripts ready is an important precursor to building features.

3. Tracer bullets for new features

Tracer bullets are small slices of functionality that go through all layers of the system, allowing you to test and validate your approach early. This helps in identifying potential issues and ensures that the overall architecture is sound before investing significant time in development.

TL;DR - build a tiny, end-to-end slice of the feature first, then expand it out.

4. Polish and quick wins
5. Refactors

# EXECUTE THE TASK

Invoke the `do-work` skill to execute the selected task. It handles the full unit of work end-to-end: explore the repo, implement (red/green/refactor TDD for backend, direct for frontend), validate with `pnpm run typecheck` and `pnpm run test`, then commit once both pass cleanly.

When `do-work` commits, the commit message must:

1. Include key decisions made
2. Include files changed
3. Blockers or notes for next iteration

# THE ISSUE

If the task is complete, close the original GitHub issue using `gh issue close <number> --repo <repo>`.

If the task is not complete, leave a comment on the GitHub issue using `gh issue comment <number> --repo <repo>` with what was done.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
