# Project Timeline: CFTracker

This timeline summarizes CFTracker’s development from its initial 2021 commit through the current `origin/main` snapshot. It combines notable recent milestones with reproducible six-month codebase measurements.

## Overview

CFTracker began as a React application for exploring Codeforces data and grew into a full-stack project with authentication, lists, statistics, a Go backend, automated verification, and contest-maintenance tooling.

## Project development highlights

- **2021 — Foundation:** Started as a Create React App project for browsing Codeforces contests and problems.
- **2022–2023 — Product expansion:** Added the main contest/problem workflows and expanded the stored Codeforces data model.
- **2024 — Full-stack transition:** Added authentication, user profiles, lists, statistics, PostgreSQL-backed services, and a Go backend while modernizing the frontend with Vite and React.
- **2025 — Product refinement:** Continued feature development, data updates, deployment work, and frontend/backend maintenance.
- **2026 — Quality and maintainability:** Added backend verification, repository and API coverage, migration checks, security fixes, and stronger CI conventions.

## Recent work: shared-contest MCP workflow

The latest major milestone, delivered across commits `20bc9e4` through `1a656e4` (2026-08-27 to 2026-09-02), introduced a tested MCP workflow for maintaining shared Codeforces contests. It added the MCP server and supporting services, hardened contest maintenance, automated Inspector coverage, and documented a simpler operator workflow through a reusable skill.

## Whole-project growth at six-month intervals

Historical interval points use the latest commit available on the local `origin/main` reference on or before each timestamp. Previously recorded measurements are preserved. The final recorded point measures committed snapshot `9fc7221` on `dev`; same-day branch or commit changes append new snapshots while preserving earlier measurements. Rerunning the same date, branch, and commit adds no duplicate. Uncommitted files are excluded. `cloc` excludes JSON and `.git`, `node_modules`, `dist`, and `build`.

The chart shows **normal code**, **test code**, and **overall code** on one scale. Overall is normal plus tests. Test code includes files under `test/`, `tests/`, `__tests__/`, and `testdata/`, plus named `*.test.*`, `*.spec.*`, and `*_test.go` files; shared mocks and fixtures within those directories are included. Normal code is every other counted file, including documentation, configuration, and generated sources that `cloc` recognizes. These are code-line counts, not executable coverage locations.

![Project growth](docs/project-growth.svg)

Code lines grew from 162 to 28,376; counted files grew from 11 to 349. Source: [preserved CSV totals](docs/cloc-main-six-monthly.csv) and [normal/test breakdown](docs/cloc-main-six-monthly-breakdown.csv). The horizontal axis is proportional to elapsed time.

| Timestamp | Branch | Snapshot | Files | Normal code | Test code | Overall code |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 2021-02-01 | main | `a450d15` | 11 | 155 | 7 | 162 |
| 2021-08-01 | main | `a3c2907` | 47 | 3,240 | 7 | 3,247 |
| 2022-02-01 | main | `0ceeb36` | 58 | 3,635 | 7 | 3,642 |
| 2022-08-01 | main | `731ee5b` | 58 | 3,644 | 7 | 3,651 |
| 2023-02-01 | main | `ed716c3` | 58 | 3,699 | 7 | 3,706 |
| 2023-08-01 | main | `3872091` | 58 | 3,676 | 7 | 3,683 |
| 2024-02-01 | main | `44efdba` | 100 | 5,093 | 7 | 5,100 |
| 2024-08-01 | main | `2bf42bb` | 131 | 6,331 | 7 | 6,338 |
| 2025-02-01 | main | `0ce7e5b` | 182 | 8,364 | 7 | 8,371 |
| 2025-08-01 | main | `f33f074` | 182 | 8,364 | 7 | 8,371 |
| 2026-02-01 | main | `3853b64` | 194 | 10,938 | 7 | 10,945 |
| 2026-08-01 | main | `9829286` | 195 | 12,355 | 0 | 12,355 |
| 2026-09-02 | main | `98b5f23` | 245 | 14,619 | 3,827 | 18,446 |
| 2026-09-03 | dev | `f1b9c62` | 261 | 16,154 | 4,952 | 21,106 |
| 2026-10-04 | dev | `61c684e` | 306 | 18,375 | 7,276 | 25,651 |
| 2026-10-04 | dev | `9fc7221` | 349 | 18,586 | 9,790 | 28,376 |
