import { expect, test } from "vitest";
import {
  getProblemContestIdRange,
  getHomeStatistics,
  getSnapshotDateRange,
  getStartOfCurrentWeek,
  SnapshotPeriod,
  type HomeStatistics,
  type SnapshotDateRange,
} from "../../src/components/home/homeStatistics";
import { validators } from "../../src/util/validators";
import { Verdict } from "../../src/types/CF/Verdict";
import Submission from "../../src/types/CF/Submission";
import { ParticipantType } from "../../src/types/CF/Party";

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
let submissionId = 0;

function createSubmission(options: SubmissionOptions): Submission {
  const {
    problemId,
    verdict,
    submittedAt,
    handle = "tourist",
    contestId = 1,
    index = problemId,
  } = options;
  const rating = "rating" in options ? options.rating : 800;

  return new Submission({
    id: submissionId++,
    contestId,
    index,
    creationTimeSeconds: submittedAt.getTime() / 1_000,
    relativeTimeSeconds: 0,
    verdict,
    problem: {
      contestId,
      index,
      name: problemId,
      type: "PROGRAMMING",
      rating,
      tags: [],
      solvedCount: 0,
    },
    author: {
      contestId,
      members: [{ handle }],
      participantType: ParticipantType.PRACTICE,
      ghost: false,
    },
    programmingLanguage: "GNU C++",
    passedTestCount: 0,
    timeConsumedMillis: 0,
    memoryConsumedBytes: 0,
  });
}

function assertRange(range: SnapshotDateRange, start: Date | undefined, end: Date | undefined) {
  expect(range.startTimeSeconds).toBe(start === undefined ? undefined : start.getTime() / 1_000);
  expect(range.endTimeSeconds).toBe(end === undefined ? undefined : end.getTime() / 1_000);
}

function assertStatisticCounts(
  statistics: HomeStatistics,
  expected: Omit<HomeStatistics, "solvedProblems" | "attemptedUnsolvedProblems">,
) {
  expect({
    solvedCount: statistics.solvedCount,
    activeDays: statistics.activeDays,
    averageSolvedRating: statistics.averageSolvedRating,
    attemptedUnsolvedCount: statistics.attemptedUnsolvedCount,
  }).toEqual(expected);
}

test("starts the current local week at Monday midnight without mutating the input", () => {
  const referenceDate = new Date(2026, 8, 3, 16, 45, 12, 123);
  const originalTimestamp = referenceDate.getTime();
  const startOfWeek = getStartOfCurrentWeek(referenceDate);

  expect(referenceDate.getTime()).toBe(originalTimestamp);
  expect(
    [startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), startOfWeek.getDay()],
  ).toEqual([2026, 7, 31, 1]);
  expect(
    [startOfWeek.getHours(), startOfWeek.getMinutes(), startOfWeek.getSeconds(), startOfWeek.getMilliseconds()],
  ).toEqual([0, 0, 0, 0]);
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
  expect(statistics.solvedProblems).toEqual([]);
  expect(statistics.attemptedUnsolvedProblems).toEqual([]);
});

test("deduplicates accepted submissions using problem.id", () => {
  const submissions = [
    createSubmission({ problemId: "100A", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 10), contestId: 100 }),
    createSubmission({
      problemId: "100A",
      verdict: Verdict.OK,
      submittedAt: new Date(2026, 7, 31, 11),
      contestId: 100,
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
  expect(statistics.solvedProblems).toHaveLength(1);
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
  expect(attemptedProblems).toHaveLength(1);
  expect(attemptedProblems[0]?.id).toBe(submissions[4].problem.id);
});

test("calculates the mean from rated solved problems only", () => {
  const submissions = [
    createSubmission({ problemId: "missing", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 11), rating: undefined }),
    createSubmission({ problemId: "800", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 13), rating: 800 }),
    createSubmission({ problemId: "1000", verdict: Verdict.OK, submittedAt: new Date(2026, 7, 31, 14), rating: 1_000 }),
  ];

  expect(getHomeStatistics(submissions, WEEK_RANGE).averageSolvedRating).toBe(900);
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

test("counts each submission date once regardless of verdict", () => {
  const submissions = [
    createSubmission({ problemId: "one", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 8, 2, 9) }),
    createSubmission({ problemId: "two", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 2, 10) }),
    createSubmission({ problemId: "one", verdict: Verdict.COMPILATION_ERROR, submittedAt: new Date(2026, 8, 3, 10) }),
  ];

  expect(getHomeStatistics(submissions, WEEK_RANGE).activeDays).toBe(2);
});

test("applies the selected period to attempted problems as well as solved problems", () => {
  const submissions = [
    createSubmission({ problemId: "outside", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 7, 30) }),
    createSubmission({ problemId: "inside", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 8, 1) }),
  ];

  const statistics = getHomeStatistics(submissions, WEEK_RANGE);
  expect(statistics.attemptedUnsolvedCount).toBe(1);
  expect(statistics.attemptedUnsolvedProblems[0]?.id).toBe(submissions[1].problem.id);
  expect(statistics.activeDays).toBe(1);
});

test("combines handles so one handle's acceptance solves the problem", () => {
  const submissions = [
    createSubmission({ problemId: "shared", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 7, 31, 9), handle: "first" }),
    createSubmission({ problemId: "shared", verdict: Verdict.OK, submittedAt: new Date(2026, 8, 1, 9), handle: "second" }),
    createSubmission({ problemId: "other", verdict: Verdict.WRONG_ANSWER, submittedAt: new Date(2026, 8, 1, 11), handle: "second" }),
  ];

  assertStatisticCounts(getHomeStatistics(submissions, WEEK_RANGE), {
    solvedCount: 1,
    activeDays: 2,
    averageSolvedRating: 800,
    attemptedUnsolvedCount: 1,
  });
});

test("validates URL pagination values", () => {
  expect(validators.positiveInteger("25", undefined)).toBe(25);
  for (const value of [undefined, null, "", "0", "-1", "2.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
    expect(validators.positiveInteger(value, undefined)).toBeUndefined();
  }
  expect(validators.nonNegativeInteger("0", undefined)).toBe(0);
  expect(validators.nonNegativeInteger("3", undefined)).toBe(3);
  for (const value of [undefined, null, "", "-1", "1.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
    expect(validators.nonNegativeInteger(value, undefined)).toBeUndefined();
  }
});

test("keeps high contest IDs in problem ranges", () => {
  const problems = [
    { id: "100A", contestId: 100, rating: 1_200 },
    { id: "100001A", contestId: 100_001, rating: 900 },
  ];
  expect(getProblemContestIdRange(problems)).toEqual({ min: 100, max: 100_001 });
});
