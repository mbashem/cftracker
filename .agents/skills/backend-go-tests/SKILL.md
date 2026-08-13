---
name: backend-go-tests
description: Backend-specific Go test conventions for the cftracker repository. Use when adding, reviewing, or refactoring backend Go tests, especially table tests, fixtures, mock data, and expected log or error assertions.
---

# Backend Go Tests

- Give table-test cases self-explanatory names that describe the input and expected behavior shown by `go test -v`.
- Initialize process-global test state explicitly in every test or subtest; do not depend on test execution order.
- Keep repeated dummy data in constants or small mock-data helpers. Keep one-off test literals inline when that is clearer.
- Build fixtures from one default mock-data helper and pass override groups for scenario-specific changes.
- Pass fixture data into setup helpers instead of letting helpers silently choose default values.
- Store repeated expected log/error text in constants or derive it through helper methods.
- Prefer the term `mock` over `fake` for test doubles in this repository.
- Model repository mocks as stateful in-memory repositories. Initialize the required lists, items, users, or other records during setup, then let mock methods simulate normal repository behavior; reserve explicit operation errors for failure paths.
- Keep table cases and assertion helpers near the top of the test file. Put mock types and their methods at the end so the behavior under test is visible first.
- Consolidate structurally similar mock calls and test cases into shared structs and helpers instead of creating one type per repository method.
- When an expected invocation is strictly binary, represent it with a boolean rather than an integer call count. Use an exact call slice only when order, arguments, or multiple calls are part of the assertion.
- Do not mutate table-case values or shared fixtures. Copy values before applying scenario-specific changes; mutate pointer arguments only when the real dependency contract populates returned IDs, timestamps, or similar fields.
- Keep test support code compact and remove repetition, while preserving clear case names and failure messages for the reviewer.
