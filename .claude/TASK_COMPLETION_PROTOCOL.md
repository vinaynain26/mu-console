# Task Completion & Verification Protocol

**Purpose:** Define what "done" means. Do not report a task as complete until every
section below is filled with real evidence — not a description of what should work.

## Ground Rules
- Never write "should work," "this passes," or "tests pass" without pasting the exact
  command run and its real, unedited output.
- If no test currently exercises the requested behavior, write one before claiming
  the behavior works.
- Never edit a test's assertions just to make it green. If a test fails, fix the code,
  or explain — in Section 5 — why the test's expectation was wrong.
- Cite evidence as exact file paths and line numbers, not paraphrases.
- If something can't be verified in this environment, say so in Section 5. Don't guess
  and present the guess as fact.

## 1. Requirements Coverage
List every requirement from the request in a table:

| # | Requirement (as stated) | Status | Evidence (file:line) |
|---|--------------------------|--------|------------------------|

Status is one of: `Implemented` / `Partial` / `Not Implemented` / `Out of Scope (reason)`.

## 2. Test — Proof of Behavior
- State the actual user-facing behavior being proven — not "unit test X passed" but
  "calling POST /foo with payload Y now returns 201 + Z."
- Show the exact command run.
- Paste the real terminal output verbatim, unedited.
- For UI or integration behavior a unit test can't reach, describe how you actually
  exercised it (curl, headless run, script against a running instance). A green
  checkmark in an editor is not proof.
- If existing tests already cover this, name them and show them running now — not
  "should already be covered."

## 3. Regression Check
- List what else touches the changed code: callers, shared modules/utilities,
  config, DB schema/migrations, public API contracts.
- How you checked: search commands used (e.g. `grep -rn`), full existing test suite
  run + pass/fail summary, any manual smoke test steps taken.
- What you did **not** check, and why (time, access, environment limits).

## 4. Diff — File by File
For every changed, added, or deleted file:
- Path
- What changed, in 1–2 sentences
- Why this specific change was necessary (link back to the requirement # it serves)
- Any incidental/drive-by change, called out separately and justified — or reverted
  if it isn't necessary

## 5. Unproven / Unknown
- Explicit list of anything not verified (no prod data access, no external API key,
  no browser, missing dependency, etc.).
- Assumptions made in place of verification, and what happens if each is wrong.
- Anything you're flagging for the human to check manually before merging.

## 6. Tooling & Permission Gate
Before installing any new package, dependency, plugin, or tool not already present
in the project:
1. Stop.
2. Ask explicitly: `"This would be more reliable with [tool], which isn't installed
   yet. Install it? (y/n)"`
3. Wait for an explicit yes. Never silently add a dependency to make a task easier.

Tools worth *asking about* when relevant (never auto-install):
- **Coverage** — `pytest-cov` / `c8` / `istanbul`: proves a test actually executes
  the changed line, not just that a test with that name exists.
- **Mutation testing** — `mutmut` (Python) / `Stryker` (JS): catches tests that pass
  but don't actually test the behavior.
- **Static analysis** — `mypy`, `ruff`, `eslint`, `tsc --noEmit`: run before claiming
  a change is safe, not after something breaks.
- **Contract/UI regression** — run the project's real CI suite locally, or snapshot
  testing for visual diffs.

## 7. Output Format
Every task report ends with Sections 1–5, in this order, even if a section is short.
An empty section is written as `None — see evidence above`, never omitted.
