---
name: project-growth-timeline
description: Measure a repository's six-month codebase history from main and generate cloc data plus an SVG growth graph when the user asks for a project timeline or code-growth history.
---

# Project growth timeline

Use this skill when the user asks for the repository's historical codebase growth, a six-month project timeline, or a graph based on `cloc`.

Run `scripts/generate_timeline.py` from the repository root. It samples the latest commit on `origin/main` at six-month intervals beginning February 2021, then adds a final snapshot from the current branch and `HEAD` (including the branch name), runs `cloc` on archived snapshots, excludes JSON files and `.git`, `node_modules`, `dist`, and `build`, and writes:

- `docs/cloc-main-six-monthly.csv`
- `docs/project-growth.svg`

Update or create `PROJECT_TIMELINE.md` to embed the SVG with:

```markdown
![Project growth](docs/project-growth.svg)
```

If the CSV already exists, preserve its historical rows and append only timestamps that are not already present; do not rewrite old measurements. Regenerate the SVG from all accumulated rows. Keep the CSV and timeline values synchronized, and label the final graph point with the current branch name. Do not use `git checkout`, rewrite branches, or count JSON as code. Verify the generated files with `git diff --check` and confirm the SVG is well-formed XML.
