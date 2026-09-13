/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import {
  getAttemptedUnsolvedProblems,
  getHomeStatistics,
  getSnapshotDateRange,
  getSolvedProblems,
  getStartOfCurrentWeek,
  SnapshotPeriod,
  type HomeStatisticsSubmission,
  type SnapshotDateRange,
} from "./homeStatistics.ts";
import { getProblemContestIdRange } from "../../util/submissionProblems.ts";
import { validators } from "../../util/validators.ts";

interface TestSubmission extends HomeStatisticsSubmission {
  readonly handle: string;
  readonly problem: HomeStatisticsSubmission["problem"] & {
    readonly contestId: number;
    readonly index: string;
  };
}

interface SubmissionOptions {
  readonly problemId: string;
  readonly verdict: string;
  readonly submittedAt: Date;
  readonly rating?: number | null;
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
  assert.deepEqual(getHomeStatistics([], WEEK_RANGE), {
    solvedCount: 0,
    activeDays: 0,
    averageSolvedRating: null,
    attemptedUnsolvedCount: 0,
  });
});

test("deduplicates accepted submissions using problem.id", () => {
  const submissions = [
    createSubmission({ problemId: "100A", verdict: "OK", submittedAt: new Date(2026, 7, 31, 10), contestId: 100 }),
    createSubmission({ problemId: "100A", verdict: "OK", submittedAt: new Date(2026, 7, 31, 11), contestId: 999 }),
  ];

  assert.deepEqual(getHomeStatistics(submissions, WEEK_RANGE), {
    solvedCount: 1,
    activeDays: 1,
    averageSolvedRating: 800,
    attemptedUnsolvedCount: 0,
  });
  assert.equal(getSolvedProblems(submissions, WEEK_RANGE).length, 1);
});

test("removes a solved problem from the attempted set regardless of submission order", () => {
  const submissions = [
    createSubmission({ problemId: "failed-then-solved", verdict: "WRONG_ANSWER", submittedAt: new Date(2026, 7, 31, 9) }),
    createSubmission({ problemId: "failed-then-solved", verdict: "OK", submittedAt: new Date(2026, 8, 1, 9) }),
    createSubmission({ problemId: "solved-then-failed", verdict: "OK", submittedAt: new Date(2026, 8, 1, 10) }),
    createSubmission({ problemId: "solved-then-failed", verdict: "TIME_LIMIT_EXCEEDED", submittedAt: new Date(2026, 8, 1, 11) }),
    createSubmission({ problemId: "still-attempted", verdict: "COMPILATION_ERROR", submittedAt: new Date(2026, 8, 2, 9) }),
  ];

  const attemptedProblems = getAttemptedUnsolvedProblems(submissions, WEEK_RANGE);
  assert.equal(attemptedProblems.length, 1);
  assert.equal(attemptedProblems[0]?.problem.id, "still-attempted");
});

test("calculates the mean from rated solved problems only", () => {
  const submissions = [
    createSubmission({ problemId: "negative", verdict: "OK", submittedAt: new Date(2026, 7, 31, 9), rating: -1 }),
    createSubmission({ problemId: "zero", verdict: "OK", submittedAt: new Date(2026, 7, 31, 10), rating: 0 }),
    createSubmission({ problemId: "missing", verdict: "OK", submittedAt: new Date(2026, 7, 31, 11), rating: undefined }),
    createSubmission({ problemId: "nan", verdict: "OK", submittedAt: new Date(2026, 7, 31, 12), rating: Number.NaN }),
    createSubmission({ problemId: "800", verdict: "OK", submittedAt: new Date(2026, 7, 31, 13), rating: 800 }),
    createSubmission({ problemId: "1000", verdict: "OK", submittedAt: new Date(2026, 7, 31, 14), rating: 1_000 }),
  ];

  assert.equal(getHomeStatistics(submissions, WEEK_RANGE).averageSolvedRating, 900);
});

test("uses inclusive start and exclusive end boundaries", () => {
  const submissions = [
    createSubmission({ problemId: "previous", verdict: "OK", submittedAt: new Date(2026, 7, 30, 23, 59, 59) }),
    createSubmission({ problemId: "start", verdict: "OK", submittedAt: new Date(2026, 7, 31) }),
    createSubmission({ problemId: "inside", verdict: "OK", submittedAt: new Date(2026, 8, 6, 23, 59, 59), rating: 1_000 }),
    createSubmission({ problemId: "end", verdict: "OK", submittedAt: new Date(2026, 8, 7) }),
  ];

  assert.deepEqual(getHomeStatistics(submissions, WEEK_RANGE), {
    solvedCount: 2,
    activeDays: 2,
    averageSolvedRating: 900,
    attemptedUnsolvedCount: 0,
  });
});

test("counts each active local date once", () => {
  const submissions = [
    createSubmission({ problemId: "one", verdict: "OK", submittedAt: new Date(2026, 8, 2, 9) }),
    createSubmission({ problemId: "two", verdict: "OK", submittedAt: new Date(2026, 8, 2, 10) }),
    createSubmission({ problemId: "one", verdict: "OK", submittedAt: new Date(2026, 8, 3, 10) }),
  ];

  assert.equal(getHomeStatistics(submissions, WEEK_RANGE).activeDays, 2);
});

test("applies the selected period to attempted problems as well as solved problems", () => {
  const submissions = [
    createSubmission({ problemId: "outside", verdict: "WRONG_ANSWER", submittedAt: new Date(2026, 7, 30) }),
    createSubmission({ problemId: "inside", verdict: "WRONG_ANSWER", submittedAt: new Date(2026, 8, 1) }),
  ];

  assert.equal(getHomeStatistics(submissions, WEEK_RANGE).attemptedUnsolvedCount, 1);
  assert.equal(getAttemptedUnsolvedProblems(submissions, WEEK_RANGE)[0]?.problem.id, "inside");
});

test("combines handles so one handle's acceptance solves the problem", () => {
  const submissions = [
    createSubmission({ problemId: "shared", verdict: "WRONG_ANSWER", submittedAt: new Date(2026, 7, 31, 9), handle: "first" }),
    createSubmission({ problemId: "shared", verdict: "OK", submittedAt: new Date(2026, 8, 1, 9), handle: "second" }),
    createSubmission({ problemId: "other", verdict: "WRONG_ANSWER", submittedAt: new Date(2026, 8, 1, 11), handle: "second" }),
  ];

  assert.deepEqual(getHomeStatistics(submissions, WEEK_RANGE), {
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
