import { createSelector } from "@reduxjs/toolkit";
import { getSimpleVerdict, SimpleVerdict, type default as Submission } from "../../types/CF/Submission";

export const selectProblemSubmissionStatuses = createSelector(
    (submissions: readonly Submission[]) => submissions,
    (_: readonly Submission[], submittedAfter?: number) => submittedAfter,
    (_: readonly Submission[], _after?: number, submittedBefore?: number) => submittedBefore,
    (submissions, submittedAfter, submittedBefore) => {
        const solved = new Set<string>();
        const attempted = new Set<string>();
        for (const submission of submissions) {
            if ((submittedAfter !== undefined && submission.creationTimeSeconds < submittedAfter)
                || (submittedBefore !== undefined && submission.creationTimeSeconds >= submittedBefore)) continue;

            const problemId = submission.problem.id;
            if (getSimpleVerdict(submission.verdict) === SimpleVerdict.SOLVED) solved.add(problemId);
            else attempted.add(problemId);
        }
        return { solved, attempted };
    },
);
