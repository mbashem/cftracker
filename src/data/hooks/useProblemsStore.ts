import { createSelector } from "@reduxjs/toolkit";
import { useAppSelector } from "../store";
import { useMemo } from "react";
import Problem from "../../types/CF/Problem";

function useProblemsStore() {
	const problemList = useAppSelector((state) => state.problemList);
	const memorizeProblemsById = createSelector((state: typeof problemList) => state,
		(problems) => problems.problems.reduce((previousValue, currentValue) => {
			previousValue.set(currentValue.id, currentValue);
			return previousValue;
		}, new Map<string, Problem>())
	);

	const problemsById = useMemo(() => memorizeProblemsById(problemList), [problemList]);

	return { problemList: problemList, problemsById };
}

export default useProblemsStore;