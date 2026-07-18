import { createSelector } from "@reduxjs/toolkit";
import { useMemo } from "react";
import Problem from "../../types/CF/Problem";
import { codeforcesApi } from "../queries/codeforcesQuery";
import { ProblemListState } from "../queries/codeforcesApiResponse";

const emptyProblems: Problem[] = [];
const emptyTags: string[] = [];

const memorizeProblemsById = createSelector(
	(state: ProblemListState) => state,
	(problems) => problems.problems.reduce((previousValue, currentValue) => {
		previousValue.set(currentValue.id, currentValue);
		return previousValue;
	}, new Map<string, Problem>())
);

function getProblemErrorMessage(error: unknown): string | undefined {
	if (error === undefined) return undefined;
	if (typeof error === "object" && error !== null) {
		const errorRecord = error as Record<string, unknown>;
		if (typeof errorRecord.error === "string") return errorRecord.error;
		if (typeof errorRecord.message === "string") return errorRecord.message;
	}
	return "Failed to fetch Problems list from CF API.";
}

function useProblemsStore() {
	const { data, error, isLoading } = codeforcesApi.useGetProblemsQuery();

	const problemList = useMemo<ProblemListState>(() => ({
		problems: data?.problems ?? emptyProblems,
		tags: data?.tags ?? emptyTags,
		error: getProblemErrorMessage(error) ?? data?.error,
		loading: isLoading || (data?.loading ?? false),
	}), [data, error, isLoading]);

	const problemsById = useMemo(() => memorizeProblemsById(problemList), [problemList]);

	return {
		problemList: problemList,
		problemsById,
		isProblemListLoading: problemList.loading,
		problemListError: problemList.error,
	};
}

export default useProblemsStore;
