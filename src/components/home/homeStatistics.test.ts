/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import {
  getHomeStatistics,
  getSnapshotDateRange,
  getStartOfCurrentWeek,
  SnapshotPeriod,
  type HomeStatistics,
  type HomeStatisticsSubmission,
  type SnapshotDateRange,
} from "./homeStatistics.ts";
import { getProblemContestIdRange } from "../../util/submissionProblems.ts";
import { validators } from "../../util/validators.ts";
import { Verdict } from "../../types/CF/Verdict.ts";

interface TestSubmission extends HomeStatisticsSubmission {
  readonly handle: string;
  readonly problem: HomeStatisticsSubmission["problem"] & {
    readonly contestId: number;
    readonly index: string;
  };
}

interface SubmissionOptions {
  readonly problemId: string;
  readonly verdict: Verdict;
  readonly submittedAt: Date;
  readonly rating?: number;
  readonly handle?: string;
  readonly contestId?: number;
  readonly index?: string;
}

const REFERENCE_DATE = new Date(2026, 8, 3, 12);
const WEEK_RANGE = getSnapshotDateRange(SnapshotPeriod.WEEK, {}, REFERENCE_DATE);

function createSubmission(options: SubmissionOptions): TestSubmission {
  const {
    problemId,
    verdict,
    submittedAt,
    handle = "tourist",
    contestId = 1,
    index = "A",
  } = options;
  const rating = "rating" in options ? options.rating : 800;

  return {
    creationTimeSeconds: submittedAt.getTime() / 1_000,
    verdict,
    handle,
    problem: { id: problemId, rating, contestId, index },
  };
}

function assertRange(range: SnapshotDateRange, start: Date | undefined, end: Date | undefined) {
  assert.equal(range.startTimeSeconds, start === undefined ? undefined : start.getTime() / 1_000);
  assert.equal(range.endTimeSeconds, end === undefined ? undefined : end.getTime() / 1_000);
}

function assertStatisticCounts(
  statistics: HomeStatistics,
  expected: Omit<HomeStatistics, "solvedProblems" | "attemptedUnsolvedProblems">,
) {
  assert.deepEqual({
    solvedCount: statistics.solvedCount,
    activeDays: statistics.activeDays,
    averageSolvedRating: statistics.averageSolvedRating,
    attemptedUnsolvedCount: statistics.attemptedUnsolvedCount,
  }, expected);
}

test("starts the current local week at Monday midnight without mutating the input", () => {
  const referenceDate = new Date(2026, 8, 3, 16, 45, 12, 123);
  const originalTimestamp = referenceDate.getTime();
  const startOfWeek = getStartOfCurrentWeek(referenceDate);

  assert.equal(referenceDate.getTime(), originalTimestamp);
  assert.deepEqual(
    [startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), startOfWeek.getDay()],
    [2026, 7, 31, 1],
  );
  assert.deepEqual(
    [startOfWeek.getHours(), startOfWeek.getMinutes(), startOfWeek.getSeconds(), startOfWeek.getMilliseconds()],
    [0, 0, 0, 0],
  );
});

test("creates current week, month, and year ranges", () => {
  assertRange(WEEK_RANGE, new Date(2026, 7, 31), new Date(2026, 8, 7));
  assertRange(
    getSnapshotDateRange(SnapshotPeriod.MONTH, {}, REFERENCE_DATE),
    new Date(2026, 8, 1),
    new Date(2026, 9, 1),
  );
  assertRange(
    getSnapshotDateRange(SnapshotPeriod.YEAR, {}, REFERENCE_DATE),
    new Date(2026, 0, 1),
    new Date(2027, 0, 1),
  );
});

test("supports open-ended custom ranges with an inclusive final date", () => {
  assertRange(
    getSnapshotDateRange(SnapshotPeriod.CUSTOM, { minDate: "2026-08-10" }, REFERENCE_DATE),
    new Date(2026, 7, 10),
    undefined,
  );
  assertRange(
    getSnapshotDateRange(SnapshotPeriod.CUSTOM, { maxDate: "2026-08-20" }, REFERENCE_DATE),
    undefined,
    new Date(2026, 7, 21),
  );
});

test("returns neutral statistics for an empty submission history", () => {
  const statistics = getHomeStatistics([], WEEK_RANGE);
  assertStatisticCounts(statistics, {
    solvedCount: 0,
    activeDays: 0,
    averageSolvedRating: undefined,
    attemptedUnsolvedCount: 0,
  });
  assert.deepEqual(statistics.solvedProblems, []);
  assert.deepEqual(statistics.attemptedUnsolvedProblems, []);
});

test("deduplicates accepted submissions using problem.id", () => {
  const submissions = [
    createSubmission({ problemId: "100A", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 10), contestId: 100 }),
    createSubmission({
      problemId: "100A",
      verdict: Verdict.OK,
      submittedAt: new Date(2026, 7, 31, 11),
      contestId: 999,
      rating: 2_000,
    }),
  ];

  const statistics = getHomeStatistics(submissions, WEEK_RANGE);
  assertStatisticCounts(statistics, {
    solvedCount: 1,
    activeDays: 1,
    averageSolvedRating: 800,
    attemptedUnsolvedCount: 0,
  });
  assert.equal(statistics.solvedProblems.length, 1);
});

test("removes a solved problem from the attempted set regardless of submission order", () => {
  const submissions = [
    createSubmission({ problemId: "failed-then-solved", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 7, 31, 9) }),
    createSubmission({ problemId: "failed-then-solved", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 1, 9) }),
    createSubmission({ problemId: "solved-then-failed", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 1, 10) }),
    createSubmission({ problemId: "solved-then-failed", verdict: Verdict.TIME_LIMIT_EXCEEDED, submittedAt: new Date(2026, 8, 1, 11) }),
    createSubmission({ problemId: "still-attempted", verdict: Verdict.COMPILATION_ERROR, submittedAt: new Date(2026, 8, 2, 9) }),
  ];

  const attemptedProblems = getHomeStatistics(submissions, WEEK_RANGE).attemptedUnsolvedProblems;
  assert.equal(attemptedProblems.length, 1);
  assert.equal(attemptedProblems[0]?.problem.id, "still-attempted");
});

test("calculates the mean from rated solved problems only", () => {
  const submissions = [
    createSubmission({ problemId: "missing", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 11), rating: undefined }),
    createSubmission({ problemId: "800", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 13), rating: 800 }),
    createSubmission({ problemId: "1000", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 14), rating: 1_000 }),
  ];

  assert.equal(getHomeStatistics(submissions, WEEK_RANGE).averageSolvedRating, 900);
});

test("uses inclusive start and exclusive end boundaries", () => {
  const submissions = [
    createSubmission({ problemId: "previous", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 30, 23, 59, 59) }),
    createSubmission({ problemId: "start", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31) }),
    createSubmission({ problemId: "inside", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 6, 23, 59, 59), rating: 1_000 }),
    createSubmission({ problemId: "end", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 7) }),
  ];

  assertStatisticCounts(getHomeStatistics(submissions, WEEK_RANGE), {
    solvedCount: 2,
    activeDays: 2,
    averageSolvedRating: 900,
    attemptedUnsolvedCount: 0,
  });
});

test("counts each active local date once", () => {
  const submissions = [
    createSubmission({ problemId: "one", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 2, 9) }),
    createSubmission({ problemId: "two", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 2, 10) }),
    createSubmission({ problemId: "one", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 3, 10) }),
  ];

  assert.equal(getHomeStatistics(submissions, WEEK_RANGE).activeDays, 2);
});

test("applies the selected period to attempted problems as well as solved problems", () => {
  const submissions = [
    createSubmission({ problemId: "outside", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 7, 30) }),
    createSubmission({ problemId: "inside", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 8, 1) }),
  ];

  const statistics = getHomeStatistics(submissions, WEEK_RANGE);
  assert.equal(statistics.attemptedUnsolvedCount, 1);
  assert.equal(statistics.attemptedUnsolvedProblems[0]?.problem.id, "inside");
});

test("combines handles so one handle's acceptance solves the problem", () => {
  const submissions = [
    createSubmission({ problemId: "shared", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 7, 31, 9), handle: "first" }),
    createSubmission({ problemId: "shared", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 1, 9), handle: "second" }),
    createSubmission({ problemId: "other", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 8, 1, 11), handle: "second" }),
  ];

  assertStatisticCounts(getHomeStatistics(submissions, WEEK_RANGE), {
    solvedCount: 1,
    activeDays: 1,
    averageSolvedRating: 800,
    attemptedUnsolvedCount: 1,
  });
});

test("validates URL pagination values", () => {
  assert.equal(validators.positiveInteger("25", undefined), 25);
  for (const value of [undefined, null, "", "0", "-1", "2.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(validators.positiveInteger(value, undefined), undefined);
  }
  assert.equal(validators.nonNegativeInteger("0", undefined), 0);
  assert.equal(validators.nonNegativeInteger("3", undefined), 3);
  for (const value of [undefined, null, "", "-1", "1.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(validators.nonNegativeInteger(value, undefined), undefined);
  }
});

test("keeps high contest IDs in problem ranges", () => {
  const problems = [
    { id: "100A", contestId: 100, rating: 1_200 },
    { id: "100001A", contestId: 100_001, rating: 900 },
  ];
  assert.deepEqual(getProblemContestIdRange(problems), { min: 100, max: 100_001 });
});
