---
name: develop-backend
description: CFTracker backend development conventions for Go implementation, refactoring, code review, naming, architecture, handlers, repositories, providers, SQL, migrations, tests, configuration, scripts, and backend documentation. Use whenever Codex changes or reviews files under the CFTracker backend directory.
---

# Develop CFTracker Backend

Apply these conventions within `backend/`. Follow a more specific backend skill as well when one applies; let its domain-specific rules take precedence.

## Understand The Change

- Read the relevant implementation, callers, tests, migrations, and documentation before editing.
- Preserve established package boundaries, dependency flow, and local patterns unless the task explicitly changes them.
- Keep changes focused on the requested behavior. Avoid unrelated refactors and generated-file churn.

## Name Clearly

- Give variables, functions, types, constants, files, and test cases descriptive names that reveal their role or behavior.
- Use short conventional names such as `i`, `t`, `err`, `ctx`, or a receiver only when their scope is small and their meaning is immediately clear.
- Increase name detail with scope: package-level and long-lived identifiers should be more descriptive than local temporary values.
- Use one term consistently for the same concept across models, handlers, repositories, providers, APIs, tests, and documentation.
- Store repeated strings and meaningful repeated literals in named constants. Keep one-off values inline when that is clearer.

## Keep Design Simple

- Prefer the backend's existing abstractions over introducing parallel patterns.
- Add an interface or helper only when it creates a real boundary, supports substitution, or removes meaningful duplication.
- Keep models focused on data and persistence logic inside repositories.
- Keep external API communication inside providers and inject repository or provider interfaces into consumers.
- Pass dependencies explicitly. Avoid new package-global mutable state; when existing global state is required, initialize it explicitly at each entry point or test.
- Validate untrusted input at the HTTP boundary and enforce security, ownership, and data invariants again in repository queries or transactions.
- Keep user-facing errors stable and avoid exposing internal implementation details in production responses.

## Implement Safely

- Handle returned errors completely, including deferred iteration errors such as `rows.Err()`.
- Make multi-step database changes transactional when partial completion would violate an invariant.
- Manage schema changes through versioned migrations; do not edit applied migration files.
- Keep configuration external to the binary and validate required values during startup.
- Comment decisions and accepted tradeoffs when the reason is not evident from the code; do not narrate obvious operations.
- Update the authoritative backend documentation for changed setup, configuration, commands, workflows, or behavior. Link to detailed documentation instead of duplicating it.

## Verify Proportionally

- Format changed Go code and run focused tests for the affected behavior.
- Run broader tests, race detection, `go vet`, integration tests, or migration checks when the change crosses those boundaries.
- Keep every production file covered by an introduced unit-test suite at 100% statement coverage when the file is simple enough for that standard.
- Report what was verified, what was not run, and any remaining risk without overstating what a test proves.
