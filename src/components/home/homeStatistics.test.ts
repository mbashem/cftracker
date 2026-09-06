/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import {
  getAttemptedUnsolvedProblems,
  getAverageSolvedRating,
  getHomeStatistics,
  getStartOfCurrentWeek,
  getUniqueSolvedProblems,
  getWeeklyActiveDays,
  getWeeklySolvedProblems,
  type HomeStatisticsSubmission,
} from "./homeStatistics.ts";
import {
  getProblemContestIdRange,
} from "../../util/submissionProblems.ts";
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../util/util.ts";

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
    problem: {
      id: problemId,
      rating,
      contestId,
      index,
    },
  };
}

test("starts the current local week at Monday midnight without mutating the input", () => {
  const referenceDate = new Date(2026, 8, 3, 16, 45, 12, 123);
  const originalTimestamp = referenceDate.getTime();

  const startOfWeek = getStartOfCurrentWeek(referenceDate);

  assert.equal(referenceDate.getTime(), originalTimestamp);
  assert.equal(startOfWeek.getFullYear(), 2026);
  assert.equal(startOfWeek.getMonth(), 7);
  assert.equal(startOfWeek.getDate(), 31);
  assert.equal(startOfWeek.getDay(), 1);
  assert.equal(startOfWeek.getHours(), 0);
  assert.equal(startOfWeek.getMinutes(), 0);
  assert.equal(startOfWeek.getSeconds(), 0);
  assert.equal(startOfWeek.getMilliseconds(), 0);
});

test("returns neutral statistics for an empty submission history", () => {
  assert.deepEqual(getHomeStatistics([], REFERENCE_DATE), {
    weeklySolvedCount: 0,
    weeklyActiveDays: 0,
    averageSolvedRating: null,
    attemptedUnsolvedCount: 0,
  });
});

test("deduplicates accepted submissions using problem.id", () => {
  const submissions = [
    createSubmission({
      problemId: "100A",
      verdict: "OK",
      submittedAt: new Date(2026, 7, 31, 10),
      rating: 800,
      contestId: 100,
      index: "A",
    }),
    createSubmission({
      problemId: "100A",
      verdict: "OK",
      submittedAt: new Date(2026, 7, 31, 11),
      rating: 800,
      contestId: 999,
      index: "Z",
    }),
  ];

  assert.deepEqual(getHomeStatistics(submissions, REFERENCE_DATE), {
    weeklySolvedCount: 1,
    weeklyActiveDays: 1,
    averageSolvedRating: 800,
    attemptedUnsolvedCount: 0,
  });
  assert.equal(getUniqueSolvedProblems(submissions).length, 1);
  assert.equal(getWeeklySolvedProblems(submissions, REFERENCE_DATE).length, 1);
});

test("removes every accepted problem from the attempted backlog regardless of submission order", () => {
  const submissions = [
    createSubmission({
      problemId: "failed-then-solved",
      verdict: "WRONG_ANSWER",
      submittedAt: new Date(2026, 7, 31, 9),
    }),
    createSubmission({
      problemId: "failed-then-solved",
      verdict: "OK",
      submittedAt: new Date(2026, 8, 1, 9),
    }),
    createSubmission({
      problemId: "solved-then-failed",
      verdict: "OK",
      submittedAt: new Date(2026, 8, 1, 10),
    }),
    createSubmission({
      problemId: "solved-then-failed",
      verdict: "TIME_LIMIT_EXCEEDED",
      submittedAt: new Date(2026, 8, 1, 11),
    }),
    createSubmission({
      problemId: "still-attempted",
      verdict: "COMPILATION_ERROR",
      submittedAt: new Date(2026, 8, 2, 9),
    }),
    createSubmission({
      problemId: "still-attempted",
      verdict: "WRONG_ANSWER",
      submittedAt: new Date(2026, 8, 2, 10),
    }),
  ];

  const attemptedProblems = getAttemptedUnsolvedProblems(submissions);

  assert.equal(attemptedProblems.length, 1);
  assert.equal(attemptedProblems[0]?.problem.id, "still-attempted");
  assert.equal(getHomeStatistics(submissions, REFERENCE_DATE).attemptedUnsolvedCount, 1);
});

test("ignores missing, non-positive, and non-finite ratings in the weekly mean", () => {
  const submissions = [
    createSubmission({ problemId: "unrated-negative", verdict: "OK", submittedAt: new Date(2026, 7, 31, 9), rating: -1 }),
    createSubmission({ problemId: "unrated-zero", verdict: "OK", submittedAt: new Date(2026, 7, 31, 10), rating: 0 }),
    createSubmission({ problemId: "unrated-missing", verdict: "OK", submittedAt: new Date(2026, 7, 31, 11), rating: undefined }),
    createSubmission({ problemId: "unrated-nan", verdict: "OK", submittedAt: new Date(2026, 7, 31, 12), rating: Number.NaN }),
    createSubmission({ problemId: "rated-800", verdict: "OK", submittedAt: new Date(2026, 7, 31, 13), rating: 800 }),
    createSubmission({ problemId: "rated-1000", verdict: "OK", submittedAt: new Date(2026, 7, 31, 14), rating: 1_000 }),
  ];

  assert.equal(getAverageSolvedRating(submissions, REFERENCE_DATE), 900);
  assert.equal(getHomeStatistics(submissions, REFERENCE_DATE).averageSolvedRating, 900);
});

test("returns null when this week's solved problems are all unrated", () => {
  const submissions = [
    createSubmission({ problemId: "unrated", verdict: "OK", submittedAt: new Date(2026, 7, 31, 9), rating: -1 }),
    createSubmission({ problemId: "also-unrated", verdict: "OK", submittedAt: new Date(2026, 8, 1, 9), rating: 0 }),
  ];

  assert.equal(getAverageSolvedRating(submissions, REFERENCE_DATE), null);
  assert.equal(getHomeStatistics(submissions, REFERENCE_DATE).averageSolvedRating, null);
});

test("uses an inclusive Monday and exclusive following Monday week boundary", () => {
  const submissions = [
    createSubmission({ problemId: "previous-sunday", verdict: "OK", submittedAt: new Date(2026, 7, 30, 23, 59, 59), rating: 700 }),
    createSubmission({ problemId: "monday", verdict: "OK", submittedAt: new Date(2026, 7, 31, 0, 0, 0), rating: 800 }),
    createSubmission({ problemId: "sunday", verdict: "OK", submittedAt: new Date(2026, 8, 6, 23, 59, 59), rating: 1_000 }),
    createSubmission({ problemId: "next-monday", verdict: "OK", submittedAt: new Date(2026, 8, 7, 0, 0, 0), rating: 1_200 }),
  ];

  assert.deepEqual(getHomeStatistics(submissions, REFERENCE_DATE), {
    weeklySolvedCount: 2,
    weeklyActiveDays: 2,
    averageSolvedRating: 900,
    attemptedUnsolvedCount: 0,
  });
});

test("counts one active local date for multiple accepted submissions on the same day", () => {
  const submissions = [
    createSubmission({ problemId: "one", verdict: "OK", submittedAt: new Date(2026, 8, 2, 9) }),
    createSubmission({ problemId: "one", verdict: "OK", submittedAt: new Date(2026, 8, 2, 10) }),
    createSubmission({ problemId: "two", verdict: "OK", submittedAt: new Date(2026, 8, 2, 11) }),
  ];

  assert.equal(getWeeklyActiveDays(submissions, REFERENCE_DATE), 1);
  assert.equal(getHomeStatistics(submissions, REFERENCE_DATE).weeklyActiveDays, 1);
});

test("counts repeated acceptances of the same problem on different local dates", () => {
  const submissions = [
    createSubmission({ problemId: "one", verdict: "OK", submittedAt: new Date(2026, 7, 31, 9) }),
    createSubmission({ problemId: "one", verdict: "OK", submittedAt: new Date(2026, 8, 1, 9) }),
  ];

  assert.equal(getWeeklyActiveDays(submissions, REFERENCE_DATE), 2);
});

test("combines handles so one handle's acceptance solves the problem for all metrics", () => {
  const submissions = [
    createSubmission({
      problemId: "shared-problem",
      verdict: "WRONG_ANSWER",
      submittedAt: new Date(2026, 7, 31, 9),
      handle: "first-handle",
    }),
    createSubmission({
      problemId: "shared-problem",
      verdict: "OK",
      submittedAt: new Date(2026, 8, 1, 9),
      handle: "second-handle",
    }),
    createSubmission({
      problemId: "shared-problem",
      verdict: "OK",
      submittedAt: new Date(2026, 8, 1, 10),
      handle: "first-handle",
    }),
    createSubmission({
      problemId: "other-attempt",
      verdict: "WRONG_ANSWER",
      submittedAt: new Date(2026, 8, 1, 11),
      handle: "second-handle",
    }),
  ];

  assert.deepEqual(getHomeStatistics(submissions, REFERENCE_DATE), {
    weeklySolvedCount: 1,
    weeklyActiveDays: 1,
    averageSolvedRating: 800,
    attemptedUnsolvedCount: 1,
  });
});

test("validates URL pagination values without accepting empty, fractional, or unsafe numbers", () => {
  assert.equal(parsePositiveSafeInteger("25"), 25);
  for (const value of [null, "", "0", "-1", "2.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(parsePositiveSafeInteger(value), undefined);
  }

  assert.equal(parseNonNegativeSafeInteger("0"), 0);
  assert.equal(parseNonNegativeSafeInteger("3"), 3);
  for (const value of [null, "", "-1", "1.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(parseNonNegativeSafeInteger(value), undefined);
  }
});

test("keeps high contest IDs in problem ranges", () => {
  const problems = [
    { id: "100A", contestId: 100, rating: 1_200 },
    { id: "100001A", contestId: 100_001, rating: 900 },
  ];

  assert.deepEqual(getProblemContestIdRange(problems), { min: 100, max: 100_001 });
});
