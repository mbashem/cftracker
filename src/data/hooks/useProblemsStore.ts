import { createSelector } from "@reduxjs/toolkit";
import { useMemo } from "react";
import Problem, { ProblemData } from "../../types/CF/Problem";
import { codeforcesApi } from "../queries/codeforcesQuery";

export interface HydratedProblemListState {
	problems: Problem[];
	error: string | undefined;
	tags: string[];
	loading: boolean;
}

const selectProblems = createSelector(
	(problems: ProblemData[] | undefined) => problems,
	(problems) => {
		const tags = new Set<string>();
		const selectedProblems = (problems ?? []).reduce(
			(previousValue, currentValue) => {
			const problem = createProblem(currentValue);
			previousValue.problems.push(problem);
			previousValue.problemsById.set(problem.id, problem);
			for (const tag of problem.tags) tags.add(tag);
			return previousValue;
			},
			{
				problems: [] as Problem[],
				problemsById: new Map<string, Problem>(),
			}
		);

		return { ...selectedProblems, tags: Array.from(tags) };
	}
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
	const { problems, problemsById, tags } = selectProblems(data);

	const problemList = useMemo<HydratedProblemListState>(() => ({
		problems,
		tags,
		error: getProblemErrorMessage(error),
		loading: isLoading,
	}), [error, isLoading, problems, tags]);

	return {
		problemList: problemList,
		problemsById,
		isProblemListLoading: problemList.loading,
		problemListError: problemList.error,
	};
}

function createProblem(problem: ProblemData): Problem {
	return new Problem(
		problem.contestId,
		problem.index,
		problem.name,
		problem.type,
		problem.rating,
		problem.tags,
		problem.solvedCount
	);
}

export default useProblemsStore;
