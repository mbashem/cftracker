# Frontend coverage and testing opportunities

Measured on **2026-10-04** on the `dev` working tree based on commit `61c684e`, including the uncommitted frontend tests and regression fixes from this session. This is a main-frontend report. Backend Go, manage-contests, repository policy scripts, dependencies, and live services are outside the measured denominator.

## Measured coverage

**Overall frontend coverage: 96.92%** (2,240 of 2,311 executable lines covered). This headline uses line coverage, matching the global coverage threshold; statements, functions, and branches are reported separately below.

`npm run test:frontend:coverage` ran under Node **22.22.0** with Vitest **5.0.1** and the matching V8 provider. **550 tests passed in 50 files.**

| Metric | Covered / total | Coverage | Uncovered |
| --- | --- | --- | --- |
| Lines | 2240 / 2311 | 96.92% | 71 |
| Statements | 2486 / 2592 | 95.91% | 106 |
| Functions | 627 / 651 | 96.31% | 24 |
| Branches | 1315 / 1444 | 91.06% | 129 |

The denominator includes **all `src/**/*.ts` and `src/**/*.tsx` files**, including files never imported by tests and `main.tsx`. Declaration files and `src/data/saved_api/**` are excluded: saved API catalogs are data fixtures, not application logic. Styles, assets, and test support are not included. The report contains 111 source entries, 109 with measured executable lines; 1 of those has no executed lines.

Run again with `npm run test:frontend:coverage`. Generated reports are ignored by Git:

- [Interactive HTML report](../coverage/frontend/index.html)
- [Machine-readable summary](../coverage/frontend/coverage-summary.json)
- [Detailed statement/function/branch data](../coverage/frontend/coverage-final.json)
- [LCOV report](../coverage/frontend/lcov.info)
- [Per-file CSV snapshot](../coverage/frontend/source-coverage.csv)

Vitest regenerates its reports on each coverage run. The coverage command then adds the overall line-coverage headline to the HTML overview from the JSON summary. The CSV is an analysis snapshot from this run, not an output produced by the npm script. This document preserves the measured totals if generated files are deleted.

## Source LoC versus coverage lines

The earlier **2,309** total was V8's count of instrumented executable source locations, not physical source LoC. With the heat-map and comparator fixes, that total is **2,311**. Coverage is **2,240 / 2,311 = 96.92%**; dividing covered locations by physical source lines would mix incompatible measures.

`cloc` 2.04 measured the current working tree:

| Scope | Files | Code lines | Comment lines | Blank lines | Total physical lines |
| --- | --- | --- | --- | --- | --- |
| All text sources in `src/` (TS/TSX, CSS, SVG) | 122 | **8,075** | 106 | 1,017 | **9,198** |
| TS/TSX in the coverage scope, excluding declarations and saved API catalogs | 111 | **7,623** | 100 | 928 | **8,651** |

Types/interfaces, multiline expressions and JSX, and formatting occupy source lines without each creating a separately measured executable location. Binary assets, dependencies, tests, backend, and manage-contests are outside these source counts. Code lines include source syntax, not just executable statements.

Reproduce the counts:

```sh
cloc src
cloc src --include-ext=ts,tsx --exclude-dir=saved_api --not-match-f='\.d\.ts$'
```

Machine-readable snapshots: [all src LoC](../coverage/frontend/cloc-src.json), [coverage-scope LoC](../coverage/frontend/cloc-runtime-scope.json). Generated artifacts are ignored by Git and will be removed on the next coverage run unless recreated.

## Heat-map coverage update — 2026-10-04

Added **13 tests** in `tests/common/charts/heat-maps/D3CalendarHeatMap.test.tsx` and `ReactCalendarHeatMap.test.tsx`. Tests run real D3 and React SVG rendering; the existing shared frontend theme mock is reused. Each new test includes the Codex disclaimer.

| Component | Lines | Branches | Functions |
| --- | --- | --- | --- |
| D3CalendarHeatMap | **100% (28/28)**, previously 0% | 87.50% (7/8) | 100% (11/11) |
| ReactCalendarHeatMap | **100% (25/25)** | 100% (10/10) | 100% (10/10) |
| Combined heat-maps directory | **100% (53/53)** | **94.44% (17/18)** | **100% (21/21)** |

New evidence covers Sunday-start cell geometry, month labels, zero/max color values, all-zero data, dimension/year updates, StrictMode replay, unmount cleanup, empty-data recovery, hover metadata and zero/missing distinction, responsive 900px boundaries, and theme labels.

The regressions exposed two fixes: D3 cleanup now captures the SVG element instead of accessing a ref React clears, preventing duplicate StrictMode charts and removing generated content on unmount; empty React data now creates no invalid-date cells. The remaining D3 branch is the missing-ref guard, which ordinary committed React rendering does not exercise.

All **449 tests passed in 49 files**; typecheck, lint, and production build passed. Overall coverage is **95.54% lines**, **94.40% statements**, **95.85% functions**, and **85.59% branches**. SVG DOM checks do not establish browser pixel layout or visual correctness.

## Utility coverage update — 2026-10-04

Added **101 tests** for both theme palettes and rating boundaries, sorting ties and unrated problems, submission ordering, query decoding and malformed escapes, numeric guards, optional-string fallback, omitted property validators, and invalid comparator results. Each new test declaration includes the Codex disclaimer. The existing submission fixture is reused; no new mocks were added.

All files under `src/util/`, including routing utilities, reach **100% in all four metrics**: **479/479 lines**, **545/545 statements**, **101/101 functions**, and **356/356 branches**. The coverage configuration enforces these directory thresholds alongside the global 95% line minimum.

`upperBound` preserves the requested `Compared` enum comparisons and now throws a `RangeError` for an invalid comparator result instead of looping forever. Normal comparator behavior is unchanged.

`npm run verify:frontend` passed: **550 tests in 50 files**, typecheck, lint, and production build. Overall coverage is **96.92% lines**, **95.91% statements**, **96.31% functions**, and **91.06% branches**. Browser and live-service checks remain unexecuted.

## Coverage by source area

Percentages below are weighted by executable counts, not averages of file percentages. N/A means the area has no measured items for that metric.

| Area | Lines | Branches | Functions |
| --- | --- | --- | --- |
| `App.tsx` | 100.00% | N/A | 100.00% |
| `components/Menu.tsx` | 100.00% | 100.00% | 100.00% |
| `components/comment` | 100.00% | 100.00% | 100.00% |
| `components/common` | 97.82% | 87.22% | 96.43% |
| `components/contest` | 97.86% | 93.55% | 97.73% |
| `components/home` | 95.33% | 88.29% | 92.50% |
| `components/list` | 97.59% | 82.61% | 96.55% |
| `components/problem` | 96.12% | 86.89% | 88.24% |
| `components/stats` | 100.00% | 100.00% | 100.00% |
| `data/hooks` | 95.03% | 66.22% | 98.00% |
| `data/listeners` | 100.00% | 91.67% | 100.00% |
| `data/queries` | 92.55% | 90.32% | 97.56% |
| `data/reducers` | 94.55% | 81.48% | 90.48% |
| `data/store.ts` | 85.00% | 100.00% | 100.00% |
| `hooks` | 99.54% | 96.43% | 98.39% |
| `main.tsx` | 0.00% | N/A | N/A |
| `types` | 90.32% | 80.52% | 92.86% |
| `util` | 100.00% | 100.00% | 100.00% |

Statistics/chart calculations reach 100% in this run, but the Chart.js canvas renderer is mocked. That result does not measure canvas rendering, focus, contrast, or real hover behavior. Most page tests reuse mocked data hooks, so high page coverage does not establish the correctness of real catalog hydration, submission fetching, or shared-problem expansion.

## Largest code gaps

These files account for the largest numbers of unexecuted lines. A module can execute its initialization while leaving all important request/state branches untested.

| File | Uncovered lines | Line coverage | Branch coverage |
| --- | --- | --- | --- |
| `src/types/CF/Contest.ts` | 19 | 84.29% | 75.00% |
| `src/data/queries/codeforcesQuery.ts` | 7 | 75.86% | 66.66% |
| `src/data/hooks/useSharedProblemsStore.ts` | 5 | 66.66% | 16.66% |
| `src/components/home/Snapshot.tsx` | 5 | 85.71% | 86.04% |
| `src/components/problem/ProblemFilterModal.tsx` | 4 | 42.85% | 100.00% |
| `src/data/store.ts` | 3 | 85.00% | 100.00% |
| `src/types/CF/Problem.ts` | 2 | 94.11% | 100.00% |
| `src/data/reducers/appSlice.ts` | 2 | 66.66% | 100.00% |
| `src/data/hooks/useProblemsStore.ts` | 2 | 90.47% | 66.66% |
| `src/components/problem/problem-list/ProblemTable.tsx` | 2 | 71.42% | 83.33% |
| `src/components/problem/problem-list/ProblemList.tsx` | 2 | 86.66% | 78.57% |
| `src/components/contest/contest-list/ProblemsListCell.tsx` | 2 | 77.77% | 55.55% |
| `src/components/common/forms/Input/InputRange.tsx` | 2 | 33.33% | 50.00% |
| `src/components/common/Pagination.tsx` | 2 | 93.54% | 80.48% |
| `src/main.tsx` | 1 | 0.00% | 100.00% |
| `src/hooks/useToast.ts` | 1 | 66.66% | 100.00% |
| `src/data/reducers/userSlice.ts` | 1 | 94.44% | 75.00% |
| `src/data/hooks/useUserStore.ts` | 1 | 92.85% | 66.66% |
| `src/data/hooks/useSubmissionsStore.ts` | 1 | 97.95% | 76.47% |
| `src/components/list/useListPage.ts` | 1 | 97.50% | 56.25% |

Zero-line-coverage files:

- `src/main.tsx`

## Remaining-gap execution update — 2026-10-04

Added **51 tests** across data normalization/catalog hooks/submission synchronization, Home, saved sessions and authentication races, integrated list mutations, comments/analytics, API caching, input controls, model copying, and comparator boundaries. All new test declarations carry the Codex disclaimer. Shared fetch/frontend mocks are reused; analytics/spinner mocks and the submission factory were extracted from their original locations to avoid duplicates. The shared backend helper now provides the full Redux/query/listener stack.

| Original opportunity | New automated evidence | Remaining variants |
| --- | --- | --- |
| GAP-01–02 | Real handle normalization/removal, listener cancellation, stale results, inter-handle delay, partial/network failure, retry, reducer loading guards, invalid entries | Broader all-failure/large-handle matrices |
| GAP-03–04 | Statistics matched by ID, missing IDs/statistics, failed payloads, shared target hydration and expansion, raw counts, repeated/split targets, independent metadata | Additional malformed response shapes and multi-handle canonical equivalence matrices |
| GAP-05 | Real Home page and hook: no handles, add/remove, loading, empty, error text safety, populated history, period persistence | Broader date-control/statistic navigation combinations |
| GAP-06 | Session restore/corrupt JSON, persisted logout, logout during pending callback across hook instances, superseded callback identity | Expired-token recovery policy and backend 401/403 session cleanup remain undecided/unverified |
| GAP-07 | Real ListPage + Redux + RTK Query + fetch: rename refresh and confirmed deletion/selection cleanup | Integrated create/add/remove and failure races; existing separate page/API suites cover their boundaries |
| GAP-08–09 | Real hydrated catalog stores, memoized identity/update, empty/missing sources; saved catalog query source; fetch normalization/error; cache reuse, exact expiry, coalescing, retry, corruption, pruning, ordinary mode | Error-message variants in store hooks, failed saved-module imports, arbitrary malformed cache records |
| GAP-11 | Script attributes, both initial themes, rerender/remount deduplication; route/query tracking and no rerender duplication | Live blocked embed and theme messaging; existing embed retains initial theme |
| GAP-12 | Numeric reset/cancellation, date changes/reversed/future limits/clear/native picker fallback, slider crossing bounds, editable text submit/blur/clear | Real keyboard/focus/modal containment and broader input boundary variants |
| GAP-15 | Upper-bound enum comparison termination, clone metadata/independent arrays, submission copy/verdict/date/tied sorting | Undefined empty/reversed random ranges and malformed collection contracts |
| GAP-17 | Home errors rendered as inert text, problem HTTP/API errors, fetch failure retry | Full hostile-input/service outage matrix |
| GAP-10, GAP-13–14, GAP-16, GAP-18–20 | Existing jsdom boundary coverage only | Browser reload/routing, timezone/DST, restricted storage, visual/accessibility, live OAuth/ownership/services, performance budgets, mutation testing remain unexecuted |

Regression fixes: problem statistics join on canonical IDs; expanded shared submissions use the target contest ID and deduplicate on submission/contest/index; handle update IDs remain increasing within a millisecond; authentication results are guarded by a Redux version invalidated by logout/new callbacks; HTTP failures reject; upper-bound searches use Compared enum checks; cloned problems retain solve count/optional metadata; failed submission ties compare equal.

Coverage improved from **79.36% to 94.36% lines** and **71.49% to 85.04% branches**, using the same provider and exclusions. **436 tests passed in 47 files**, followed by successful typecheck, lint, and production build. These results do not mean all 90 plan cases or all browser steps passed. No expected-failure markers were introduced.

## Testing opportunities

This is a broad inventory, not a count of every possible input combination. The original 90-case frontend plan supplied the feature inventory; code percentages cannot be converted into a percentage of completed acceptance cases. Many existing cases have partial jsdom evidence and unexecuted browser steps.

The following scenarios retain their original draft acceptance criteria. The execution status below distinguishes new automated evidence from unexecuted variants. Use shared fixtures and the existing frontend/fetch mocks; test real subjects and Redux transitions. Unless specified, preconditions are clean storage, controlled time, representative catalog/submission fixtures, and mocked services. P0 addresses data integrity and core behavior; P1 addresses remaining regressions/integration; P2 addresses measurement and test effectiveness.

| ID / priority | Preconditions and steps | Expected evidence | Disclaimer |
| --- | --- | --- | --- |
| GAP-01 / P0 | Cases 008–014: real user/submission reducers and listener; edit handles, supersede a request, remove a pending handle, then resolve old responses. | Exact handle normalization, no stale-user results, correct loading counts, no response resurrects a removed handle. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-02 / P0 | Cases 010–013: two or three handles; mix HTTP/network/API failures with success, refresh again, and advance the 1-second inter-handle delay. | Partial success remains usable, failures finish loading, cancellation stops stale dispatches, retry recovers, malformed entries are filtered. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-03 / P0 | Real Codeforces response normalizers; supply reordered/missing statistics, missing IDs, unknown verdicts, empty arrays, and failed/malformed payloads. | Statistics match problem IDs rather than an assumed array position; invalid entries do not corrupt valid catalog data; failures remain recoverable. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-04 / P0 | Case 015: real shared-problem hydration and submission expansion; supply multiple equivalent contest/index pairs and duplicate submissions across handles. | Canonical IDs, accepted/attempted status, raw-versus-expanded counts, deduplication, stable ordering, and source immutability remain correct. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-05 / P0 | Cases 016–025: render real HomePage/useHomePage with populated, empty, loading, and error state; change handles and snapshot periods. | Visible state, totals, date controls, stored periods, and destination URLs agree across transitions. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-06 / P0 | Cases 057–060: restore saved authentication, expire/reject the token, sign out while a callback/request is pending, and attempt a protected mutation. | Defined expired-session recovery and feedback, consistent Redux/token state, protected content clears, stale responses do not silently restore a logged-out session. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-07 / P0 | Cases 061–068: real page plus RTK Query plus shared fetch mock; complete create/select/rename/add/remove/delete including delayed list switches. | Forms, query invalidation, selection, and rendered membership agree in one integrated flow; pending/error cases preserve retryable state. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-08 / P1 | Real catalog store hooks; vary loading/error responses and equivalent/new array identities, then update catalogs. | Hydrated models, lookup maps, selectors, and error messages remain accurate and stable. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-09 / P1 | Codeforces queries and fetch/cache helper in debug and ordinary modes; exercise cache hit/expiry, bad stored data, offline responses, and failed dynamic imports. | Correct request or saved-data source is selected, corrupted cache is recoverable, errors surface without permanent loading. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-10 / P1 | Cases 001–007: browser direct loads/reloads for every route, production lazy-module failures, unknown routes, and Back/Forward. | Deployment routing and lazy loading work; recoverability of unknown routes/module errors is agreed and verified. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-11 / P1 | Cases 069–072: comments mount/remount and theme change; simulate blocked embed and spy on route/query analytics changes. | One embed per section, intended script attributes/theme behavior, isolated failure, and agreed pageview calls without loops. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-12 / P1 | Case 026, Cases 081–083: real shared date/number/range/slider inputs, editable text, icon buttons, tooltips, pagination, and nested modals. | Change/clear/validation behavior, accessible names, disabled state, focus movement, keyboard controls, and status announcements are correct. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-13 / P1 | Cases 052–054, Cases 075–080: Asia/Dhaka plus a DST-observing timezone; test midnight, DST transitions, leap/century years, reversed date/rating ranges, and clearing optional values. | Calendar grouping uses the intended local day, ranges have defined behavior, URL/storage do not lose clear/empty values. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-14 / P1 | Cases 077–079: real browser restricted/private/quota-full storage and cross-tab/reload changes; exercise supported persistence controls. | Defined recovery and preference restoration work under actual browser restrictions; cross-tab expectations are decided before assertions. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-15 / P1 | Utility/model boundaries: Compared enum results for upperBound, empty/reversed random ranges, clone fidelity, tied submissions, nullish/malformed collections. | Comparator termination/order and copy/validation contracts are specified and verified; tests guard against hanging searches. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-16 / P1 | Case 054, Cases 084–086: real chart canvas/SVG, both themes, keyboard and pointer interaction, 320/375/768/1440px, 200% zoom, Chrome/Firefox/Safari. | Legible labels, tooltips/legends, responsive controls, focus and contrast meet reviewed expectations. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-17 / P1 | Case 062, Case 087, Case 089: hostile text, oversized names, malformed responses, duplicate requests, offline/interrupted refresh, backend 401/403/404/500. | Text remains inert, validation is actionable, loading terminates, retry is possible, and unauthorized data is not rendered. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-18 / P1 | Integration deployment with disposable accounts; complete GitHub OAuth and list ownership checks across two accounts; verify Codeforces payload and Utterances contracts. | Actual services conform to the frontend contract; server-side ownership is verified independently of frontend mocks. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-19 / P2 | Case 088: representative large catalogs and multi-handle histories; measure filtering, sorting, expansion, chart switching, rendering, and memory. | Record timings/heap and establish budgets; detect unexpected growth or render/request loops. | Generated by Codex and not thoroughly checked for correctness. |
| GAP-20 / P2 | Run mutation testing on filtering, snapshots, state validation, and authentication assertions; review duplicate/trivial tests and test-order isolation. | Assertions detect deliberately changed behavior; test count and execution coverage are supplemented by evidence of test effectiveness. | Generated by Codex and not thoroughly checked for correctness. |

Next, cover the remaining malformed/error variants in real catalog hooks and integrated list failures, define expired-session recovery, then execute the browser and live-service matrix. Do not chase 100% by testing unused legacy components without first confirming they are still product behavior.

## Limits and validation

Coverage records executed code, not assertion strength or release readiness. No browser application, live service, backend test, performance test, or mutation test was run for this measurement. Source maps and the V8 provider define statement/branch counts; comparisons should use this same provider and exclusion policy.

The coverage command and subsequent typecheck, lint, and production build passed. Generated HTML JavaScript is excluded from ESLint through `coverage/**`, matching the existing generated-output boundary. A global **95% line-coverage minimum** is enforced by `npm run test:frontend:coverage` and `npm run verify:frontend` (including CI). `src/util/**` additionally enforces **100% lines, statements, functions, and branches**; other areas retain the global line threshold. The production build retains its existing large-chunk warning.

Outside this frontend scope, separate useful test tracks are backend Go unit/HTTP/Postgres/migration coverage, manage-contests operator workflow/contracts, and repository policy/security checks. Their results must be measured separately; this report makes no claim about their coverage.
