export interface SubmissionProblem {
  readonly id: string;
  readonly contestId?: number;
  readonly rating?: number | null;
}

export interface ContestIdRange {
  readonly min: number;
  readonly max: number;
}

export function isRatedProblem(problem: SubmissionProblem): boolean {
  return typeof problem.rating === "number" && Number.isFinite(problem.rating) && problem.rating > 0;
}

export function getProblemContestIdRange(
  problems: Iterable<SubmissionProblem>,
): ContestIdRange | undefined {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const problem of problems) {
    const contestId = problem.contestId;
    if (contestId === undefined || !Number.isSafeInteger(contestId)) continue;
    min = Math.min(min, contestId);
    max = Math.max(max, contestId);
  }

  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : undefined;
}
