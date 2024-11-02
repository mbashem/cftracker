import { useMemo } from "react";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import { SimpleVerdict, Verdict } from "../../types/CF/Submission";
import { isDefined } from "../../util/util";
import useTheme from "../../data/hooks/useTheme";

function useStatPage() {
	const { rawSubmissions } = useSubmissionsStore();
	const { theme } = useTheme();

	const problemIDsGroupedBySimpleVerdict = useMemo(() => {
		const groupedProblems = new Map<SimpleVerdict, Map<number, Set<string>>>();

		for (let submission of rawSubmissions) {
			const verdict = submission.verdict === Verdict.OK ? SimpleVerdict.SOLVED : SimpleVerdict.ATTEMPTED;
			if (!isDefined(groupedProblems.get(verdict))) {
				groupedProblems.set(verdict, new Map());
			}

			if (!isDefined(groupedProblems.get(verdict)?.get(submission.problem.rating))) {
				groupedProblems.get(verdict)?.set(submission.problem.rating, new Set());
			}

			groupedProblems.get(verdict)?.get(submission.problem.rating)?.add(submission.problem.id);
		}

		for (let submission of rawSubmissions) {
			if (submission.verdict === Verdict.OK)
				groupedProblems.get(SimpleVerdict.ATTEMPTED)?.get(submission.problem.rating)?.delete(submission.problem.id);
		}

		return groupedProblems;
	}, [rawSubmissions]);


	return { problemIDsGroupedBySimpleVerdict, theme };
}

export default useStatPage;