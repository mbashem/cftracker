const ACCEPTED_VERDICT = "OK";
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

export interface HomeStatisticsSubmission {
  readonly creationTimeSeconds: number;
  readonly verdict: string;
  readonly problem: {
    readonly id: string;
    readonly contestId?: number;
    readonly rating?: number | null;
  };
}

export interface HomeStatistics {
  readonly solvedCount: number;
  readonly activeDays: number;
  readonly averageSolvedRating: number | null;
  readonly attemptedUnsolvedCount: number;
}

interface SubmissionAnalysis {
  readonly solvedProblems: Map<string, HomeStatisticsSubmission>;
  readonly activeDates: Set<string>;
  readonly attemptedUnsolvedProblems: Map<string, HomeStatisticsSubmission>;
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

function getLocalDate(dateValue: string): Date | undefined {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
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
      startDate = customRange.minDate === undefined ? undefined : getLocalDate(customRange.minDate);
      endDate = customRange.maxDate === undefined ? undefined : getLocalDate(customRange.maxDate);
      if (endDate !== undefined) endDate.setDate(endDate.getDate() + 1);
      break;
  }

  return {
    startTimeSeconds: startDate === undefined ? undefined : startDate.getTime() / MILLISECONDS_PER_SECOND,
    endTimeSeconds: endDate === undefined ? undefined : endDate.getTime() / MILLISECONDS_PER_SECOND,
  };
}

function isRated(submission: HomeStatisticsSubmission): boolean {
  const { rating } = submission.problem;
  return typeof rating === "number" && Number.isFinite(rating) && rating > 0;
}

function preferRatedSubmission(
  submissionsByProblem: Map<string, HomeStatisticsSubmission>,
  submission: HomeStatisticsSubmission,
): void {
  const existingSubmission = submissionsByProblem.get(submission.problem.id);
  if (existingSubmission === undefined || (!isRated(existingSubmission) && isRated(submission))) {
    submissionsByProblem.set(submission.problem.id, submission);
  }
}

function getLocalDateKey(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * MILLISECONDS_PER_SECOND);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isInsideRange(submission: HomeStatisticsSubmission, range: SnapshotDateRange): boolean {
  return (range.startTimeSeconds === undefined || submission.creationTimeSeconds >= range.startTimeSeconds)
    && (range.endTimeSeconds === undefined || submission.creationTimeSeconds < range.endTimeSeconds);
}

function analyseSubmissions(
  submissions: readonly HomeStatisticsSubmission[],
  range: SnapshotDateRange,
): SubmissionAnalysis {
  const solvedProblems = new Map<string, HomeStatisticsSubmission>();
  const activeDates = new Set<string>();
  const attemptedUnsolvedProblems = new Map<string, HomeStatisticsSubmission>();

  for (const submission of submissions) {
    if (!isInsideRange(submission, range)) continue;
    if (submission.verdict !== ACCEPTED_VERDICT) {
      if (!attemptedUnsolvedProblems.has(submission.problem.id)) {
        attemptedUnsolvedProblems.set(submission.problem.id, submission);
      }
      continue;
    }
    preferRatedSubmission(solvedProblems, submission);
    activeDates.add(getLocalDateKey(submission.creationTimeSeconds));
  }

  for (const problemId of solvedProblems.keys()) attemptedUnsolvedProblems.delete(problemId);
  return { solvedProblems, activeDates, attemptedUnsolvedProblems };
}

function calculateAverageRating(submissions: Iterable<HomeStatisticsSubmission>): number | null {
  let ratingTotal = 0;
  let ratedProblemCount = 0;
  for (const submission of submissions) {
    const { rating } = submission.problem;
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) continue;
    ratingTotal += rating;
    ratedProblemCount += 1;
  }
  return ratedProblemCount === 0 ? null : ratingTotal / ratedProblemCount;
}

export function getSolvedProblems(
  submissions: readonly HomeStatisticsSubmission[],
  range: SnapshotDateRange,
): HomeStatisticsSubmission[] {
  return [...analyseSubmissions(submissions, range).solvedProblems.values()];
}

export function getAttemptedUnsolvedProblems(
  submissions: readonly HomeStatisticsSubmission[],
  range: SnapshotDateRange,
): HomeStatisticsSubmission[] {
  return [...analyseSubmissions(submissions, range).attemptedUnsolvedProblems.values()];
}

export function getHomeStatistics(
  submissions: readonly HomeStatisticsSubmission[],
  range: SnapshotDateRange,
): HomeStatistics {
  const analysis = analyseSubmissions(submissions, range);
  return {
    solvedCount: analysis.solvedProblems.size,
    activeDays: analysis.activeDates.size,
    averageSolvedRating: calculateAverageRating(analysis.solvedProblems.values()),
    attemptedUnsolvedCount: analysis.attemptedUnsolvedProblems.size,
  };
}
