import { createSelector } from "@reduxjs/toolkit";
import { useMemo } from "react";
import { ProblemLite, ProblemShared, ProblemSharedData } from "../../types/CF/Problem";
import { codeforcesApi } from "../queries/codeforcesQuery";
import { EMPTY_ARRAY } from "../../util/constants";

interface HydratedSharedProblemListState {
	problems: readonly ProblemShared[];
	error: string | undefined;
	loading: boolean;
}

const hydrateSharedProblems = createSelector(
	(problems: ProblemSharedData[] | undefined) => problems,
	(problems) => problems?.map(createSharedProblem) ?? EMPTY_ARRAY
);

function getSharedProblemErrorMessage(error: unknown): string | undefined {
	if (error === undefined) return undefined;
	if (typeof error === "object" && error !== null) {
		const errorRecord = error as Record<string, unknown>;
		if (typeof errorRecord.error === "string") return errorRecord.error;
		if (typeof errorRecord.message === "string") return errorRecord.message;
	}
	return "Error processing shared problems";
}

function useSharedProblemsStore() {
	const { data, error, isLoading } = codeforcesApi.useGetSharedProblemsQuery();
	const problems = hydrateSharedProblems(data);

	const sharedProblems = useMemo<HydratedSharedProblemListState>(() => ({
		problems,
		error: getSharedProblemErrorMessage(error),
		loading: isLoading,
	}), [error, isLoading, problems]);

	return {
		sharedProblems,
		isSharedProblemsLoading: sharedProblems.loading,
		sharedProblemsError: sharedProblems.error,
	};
}

function createSharedProblem(problem: ProblemSharedData): ProblemShared {
	return new ProblemShared(
		problem.contestId,
		problem.index,
		problem.shared?.map((relatedProblem) =>
			new ProblemLite(relatedProblem.contestId, relatedProblem.index)
		)
	);
}

export default useSharedProblemsStore;
