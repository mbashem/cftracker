---
name: develop-frontend
description: CFTracker frontend development and review conventions, including the boundary around running the application. Use whenever Codex changes or reviews the main CFTracker frontend outside backend and manage-contests.
---

# Develop CFTracker Frontend

Apply this skill to the main CFTracker frontend, including files under `src/` and its root-level frontend configuration. Do not apply it to `backend/` or `manage-contests/`.

## Do Not Run The Application Without A Request

- Do not start, serve, preview, open, or interact with the running application unless the user explicitly asks for real-app execution in the current request.
- This includes starting a development or preview server and using Browser, Chrome, Playwright, or similar UI automation against a running instance. Do not interact with an instance that is already running either.
- A request to implement, diagnose, test, verify, or review frontend code does not by itself authorize running the application.
- Static code inspection and non-interactive unit tests, typechecking, linting, and production builds remain allowed unless the user restricts them.
- If adequate verification requires the running application but the user has not requested it, report that the live-app check was not run.
