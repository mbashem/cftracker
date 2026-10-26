---
name: project-growth-timeline
description: Measure a repository's six-month codebase history from main and generate cloc data plus an SVG growth graph when the user asks for a project timeline or code-growth history.
---

# Project growth timeline

Use this skill when the user asks for the repository's historical codebase growth, a six-month project timeline, or a graph based on `cloc`.

## Preserve snapshots

Preserve existing CSV rows without rewriting old measurements. Use the timestamp as the primary grouping criterion. Historical six-month `main` intervals are recorded once per timestamp. For the current branch snapshot, allow an additional row on the same date when the branch or commit differs; identify an exact duplicate by timestamp, branch, and seven-character commit. Rerunning that exact snapshot must not append another row. Use the current date in `Asia/Dhaka` for the current branch snapshot.

Do not use `git checkout`, rewrite branches, or count JSON as code. Use the local `origin/main` reference; fetching updates requires the user's external-access permission.

## Generate data and chart

Run the maintained `scripts/generate_timeline.py` from the repository root. It samples the latest commit on `origin/main` at six-month intervals beginning February 2021, then adds a final snapshot from the current branch and `HEAD` (including the branch name), runs `cloc` on archived snapshots, excludes JSON files and `.git`, `node_modules`, `dist`, and `build`, and writes:

- `docs/cloc-main-six-monthly.csv`
- `docs/cloc-main-six-monthly-breakdown.csv`
- `docs/project-growth.svg`
- `PROJECT_TIMELINE.md`

The chart shows normal, test, and overall code lines on one scale. Overall equals normal plus test code. The script updates `PROJECT_TIMELINE.md` with the measurements and embeds the SVG with:

```markdown
![Project growth](docs/project-growth.svg)
```

## Verify outputs

Confirm historical rows are unchanged and additions follow the snapshot rules above. Keep the totals CSV, breakdown CSV, chart, and timeline values synchronized, and label the final graph point with the current branch name. Verify the generated files with `git diff --check` and confirm the SVG is well-formed XML.
