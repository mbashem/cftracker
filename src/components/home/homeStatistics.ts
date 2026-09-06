const ACCEPTED_VERDICT = "OK";
const DAYS_IN_WEEK = 7;
const MILLISECONDS_PER_SECOND = 1_000;

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
  readonly weeklySolvedCount: number;
  readonly weeklyActiveDays: number;
  readonly averageSolvedRating: number | null;
  readonly attemptedUnsolvedCount: number;
}

interface SubmissionAnalysis {
  readonly solvedProblems: Map<string, HomeStatisticsSubmission>;
  readonly weeklySolvedProblems: Map<string, HomeStatisticsSubmission>;
  readonly weeklyActiveDates: Set<string>;
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

function calculateAverageRating(
  submissions: Iterable<HomeStatisticsSubmission>,
): number | null {
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

function analyseSubmissions(
  submissions: readonly HomeStatisticsSubmission[],
  referenceDate: Date,
): SubmissionAnalysis {
  const startOfWeekSeconds = getStartOfCurrentWeek(referenceDate).getTime() / MILLISECONDS_PER_SECOND;
  const startOfNextWeekSeconds = getStartOfNextWeek(referenceDate).getTime() / MILLISECONDS_PER_SECOND;
  const solvedProblems = new Map<string, HomeStatisticsSubmission>();
  const weeklySolvedProblems = new Map<string, HomeStatisticsSubmission>();
  const weeklyActiveDates = new Set<string>();
  const attemptedUnsolvedProblems = new Map<string, HomeStatisticsSubmission>();

  for (const submission of submissions) {
    if (submission.verdict !== ACCEPTED_VERDICT) {
      if (!attemptedUnsolvedProblems.has(submission.problem.id)) {
        attemptedUnsolvedProblems.set(submission.problem.id, submission);
      }
      continue;
    }

    preferRatedSubmission(solvedProblems, submission);

    if (
      submission.creationTimeSeconds >= startOfWeekSeconds
      && submission.creationTimeSeconds < startOfNextWeekSeconds
    ) {
      preferRatedSubmission(weeklySolvedProblems, submission);
      weeklyActiveDates.add(getLocalDateKey(submission.creationTimeSeconds));
    }
  }

  for (const problemId of solvedProblems.keys()) {
    attemptedUnsolvedProblems.delete(problemId);
  }

  return {
    solvedProblems,
    weeklySolvedProblems,
    weeklyActiveDates,
    attemptedUnsolvedProblems,
  };
}

export function getUniqueSolvedProblems(
  submissions: readonly HomeStatisticsSubmission[],
): HomeStatisticsSubmission[] {
  return [...analyseSubmissions(submissions, new Date()).solvedProblems.values()];
}

export function getWeeklySolvedProblems(
  submissions: readonly HomeStatisticsSubmission[],
  referenceDate: Date = new Date(),
): HomeStatisticsSubmission[] {
  return [...analyseSubmissions(submissions, referenceDate).weeklySolvedProblems.values()];
}

export function getWeeklyActiveDays(
  submissions: readonly HomeStatisticsSubmission[],
  referenceDate: Date = new Date(),
): number {
  return analyseSubmissions(submissions, referenceDate).weeklyActiveDates.size;
}

export function getAverageSolvedRating(
  submissions: readonly HomeStatisticsSubmission[],
  referenceDate: Date = new Date(),
): number | null {
  const weeklySolvedProblems = analyseSubmissions(submissions, referenceDate).weeklySolvedProblems;
  return calculateAverageRating(weeklySolvedProblems.values());
}

export function getAttemptedUnsolvedProblems(
  submissions: readonly HomeStatisticsSubmission[],
): HomeStatisticsSubmission[] {
  return [...analyseSubmissions(submissions, new Date()).attemptedUnsolvedProblems.values()];
}

/** Derives every Home snapshot metric in one pass over the loaded submission history. */
export function getHomeStatistics(
  submissions: readonly HomeStatisticsSubmission[],
  referenceDate: Date = new Date(),
): HomeStatistics {
  const analysis = analyseSubmissions(submissions, referenceDate);

  return {
    weeklySolvedCount: analysis.weeklySolvedProblems.size,
    weeklyActiveDays: analysis.weeklyActiveDates.size,
    averageSolvedRating: calculateAverageRating(analysis.weeklySolvedProblems.values()),
    attemptedUnsolvedCount: analysis.attemptedUnsolvedProblems.size,
  };
}
