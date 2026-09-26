import { Verdict } from "../../types/CF/Verdict";
import type Problem from "../../types/CF/Problem";
import type Submission from "../../types/CF/Submission";
import { compareSubmissionTime } from "../../types/CF/Submission";
import lowerBound from "../../util/lowerBound";
import { parseDateInputValue } from "../../util/time";
import { isNumber } from "../../util/util";

const DAYS_IN_WEEK = 7;
const MILLISECONDS_PER_SECOND = 1_000;

export const SnapshotPeriod = {
  WEEK: "Week",
  MONTH: "Month",
  YEAR: "Year",
  CUSTOM: "Custom",
} as const;

export type SnapshotPeriod = typeof SnapshotPeriod[keyof typeof SnapshotPeriod];

export interface SnapshotCustomRange {
  readonly minDate?: string;
  readonly maxDate?: string;
}

export interface SnapshotDateRange {
  readonly startTimeSeconds?: number;
  readonly endTimeSeconds?: number;
}

export interface ContestIdRange {
  readonly min: number;
  readonly max: number;
}

export interface HomeStatistics {
  readonly solvedCount: number;
  readonly activeDays: number;
  readonly averageSolvedRating: number | undefined;
  readonly attemptedUnsolvedCount: number;
  readonly solvedProblems: readonly Problem[];
  readonly attemptedUnsolvedProblems: readonly Problem[];
}

interface SubmissionSummary {
  readonly solvedProblems: Map<string, Problem>;
  readonly activeDates: Set<string>;
  readonly attemptedUnsolvedProblems: Map<string, Problem>;
}

/** Returns a new Date at local midnight on the Monday of the supplied date's week. */
export function getStartOfCurrentWeek(referenceDate: Date = new Date()): Date {
  const startOfWeek = new Date(referenceDate);
  startOfWeek.setHours(0, 0, 0, 0);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % DAYS_IN_WEEK;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  return startOfWeek;
}

function getStartOfNextWeek(referenceDate: Date): Date {
  const startOfNextWeek = getStartOfCurrentWeek(referenceDate);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + DAYS_IN_WEEK);
  return startOfNextWeek;
}

export function getSnapshotDateRange(
  period: SnapshotPeriod,
  customRange: SnapshotCustomRange,
  referenceDate: Date = new Date(),
): SnapshotDateRange {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  switch (period) {
    case SnapshotPeriod.WEEK:
      startDate = getStartOfCurrentWeek(today);
      endDate = getStartOfNextWeek(today);
      break;
    case SnapshotPeriod.MONTH:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;
    case SnapshotPeriod.YEAR:
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear() + 1, 0, 1);
      break;
    case SnapshotPeriod.CUSTOM:
      startDate = customRange.minDate === undefined ? undefined : parseDateInputValue(customRange.minDate);
      endDate = customRange.maxDate === undefined ? undefined : parseDateInputValue(customRange.maxDate);
      if (endDate !== undefined) endDate.setDate(endDate.getDate() + 1);
      break;
  }

  return {
    startTimeSeconds: startDate === undefined ? undefined : startDate.getTime() / MILLISECONDS_PER_SECOND,
    endTimeSeconds: endDate === undefined ? undefined : endDate.getTime() / MILLISECONDS_PER_SECOND,
  };
}

export function isRatedProblem(problem: Pick<Problem, "rating">): boolean {
  return isNumber(problem.rating);
}

export function getProblemContestIdRange(
  problems: Iterable<Pick<Problem, "contestId">>,
): ContestIdRange | undefined {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const problem of problems) {
    min = Math.min(min, problem.contestId);
    max = Math.max(max, problem.contestId);
  }

  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : undefined;
}

function preferRatedProblem(
  problemsById: Map<string, Problem>,
  problem: Problem,
): void {
  const existingProblem = problemsById.get(problem.id);
  if (existingProblem === undefined || (!isRatedProblem(existingProblem) && isRatedProblem(problem))) {
    problemsById.set(problem.id, problem);
  }
}

function getLocalDateKey(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * MILLISECONDS_PER_SECOND);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getSubmissionsInRange(
  submissions: readonly Submission[],
  range: SnapshotDateRange,
): readonly Submission[] {
  if (range.startTimeSeconds === undefined && range.endTimeSeconds === undefined) return submissions;

  const startIndex = range.startTimeSeconds === undefined
    ? 0
    : lowerBound<Pick<Submission, "creationTimeSeconds">>(
      submissions,
      { creationTimeSeconds: range.startTimeSeconds },
      compareSubmissionTime,
    );
  const endIndex = range.endTimeSeconds === undefined
    ? submissions.length
    : lowerBound<Pick<Submission, "creationTimeSeconds">>(
      submissions,
      { creationTimeSeconds: range.endTimeSeconds },
      compareSubmissionTime,
    );
  return submissions.slice(startIndex, endIndex);
}

function getSubmissionSummary(
  submissions: readonly Submission[],
  range: SnapshotDateRange,
): SubmissionSummary {
  const solvedProblems = new Map<string, Problem>();
  const activeDates = new Set<string>();
  const attemptedUnsolvedProblems = new Map<string, Problem>();

  for (const submission of getSubmissionsInRange(submissions, range)) {
    activeDates.add(getLocalDateKey(submission.creationTimeSeconds));
    if (submission.verdict !== Verdict.OK) {
      if (!attemptedUnsolvedProblems.has(submission.problem.id)) {
        attemptedUnsolvedProblems.set(submission.problem.id, submission.problem);
      }
      continue;
    }
    preferRatedProblem(solvedProblems, submission.problem);
  }

  for (const problemId of solvedProblems.keys()) attemptedUnsolvedProblems.delete(problemId);
  return { solvedProblems, activeDates, attemptedUnsolvedProblems };
}

function calculateAverageRating(problems: Iterable<Problem>): number | undefined {
  let ratingTotal = 0;
  let ratedProblemCount = 0;
  for (const problem of problems) {
    const { rating } = problem;
    if (!isNumber(rating)) continue;
    ratingTotal += rating;
    ratedProblemCount += 1;
  }
  return ratedProblemCount === 0 ? undefined : ratingTotal / ratedProblemCount;
}

export function getHomeStatistics(
  submissions: readonly Submission[],
  range: SnapshotDateRange,
): HomeStatistics {
  const summary = getSubmissionSummary(submissions, range);
  return {
    solvedCount: summary.solvedProblems.size,
    activeDays: summary.activeDates.size,
    averageSolvedRating: calculateAverageRating(summary.solvedProblems.values()),
    attemptedUnsolvedCount: summary.attemptedUnsolvedProblems.size,
    solvedProblems: [...summary.solvedProblems.values()],
    attemptedUnsolvedProblems: [...summary.attemptedUnsolvedProblems.values()],
  };
}
