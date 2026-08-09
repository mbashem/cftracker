---
name: backend-go-tests
description: Backend-specific Go test conventions for the cftracker repository. Use when adding, reviewing, or refactoring backend Go tests, especially table tests, fixtures, mock data, and expected log or error assertions.
---

# Backend Go Tests

- Give table-test cases self-explanatory names that describe the input and expected behavior shown by `go test -v`.
- Keep repeated dummy data in constants or small mock-data helpers. Keep one-off test literals inline when that is clearer.
- Build fixtures from one default mock-data helper and pass override groups for scenario-specific changes.
- Pass fixture data into setup helpers instead of letting helpers silently choose default values.
- Store repeated expected log/error text in constants or derive it through helper methods.
