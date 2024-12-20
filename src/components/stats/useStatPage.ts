import { useMemo } from "react";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import Submission, { getSimpleVerdict, SimpleVerdict, Verdict } from "../../types/CF/Submission";
import { isDefined } from "../../util/util";
import useTheme from "../../data/hooks/useTheme";

function useStatPage() {
	const { rawSubmissions } = useSubmissionsStore();
	const { theme } = useTheme();

	const { submissionsByVerdict, problemIDsBySimpleVerdict } = useMemo(() => {
		const groupedProblems = new Map<SimpleVerdict, Map<number, Set<string>>>();
		const groupedSubmissions = new Map<Verdict, Submission[]>();

		for (let submission of rawSubmissions) {
			addSubmissionToGroupedByVerdict(submission, groupedSubmissions);
			addSubmissionsProblemToGroupedBySimpleVerdict(submission, groupedProblems);
		}

		for (let submission of rawSubmissions) {
			if (submission.verdict === Verdict.OK)
				groupedProblems.get(SimpleVerdict.ATTEMPTED)?.get(submission.problem.rating)?.delete(submission.problem.id);
		}

		return { submissionsByVerdict: groupedSubmissions, problemIDsBySimpleVerdict: groupedProblems };
	}, [rawSubmissions]);

	function addSubmissionToGroupedByVerdict(submission: Submission, groupedSubmissions: Map<Verdict, Submission[]>) {
		if (!isDefined(groupedSubmissions.get(submission.verdict)))
			groupedSubmissions.set(submission.verdict, []);
		groupedSubmissions.get(submission.verdict)?.push(submission);
	}

	function addSubmissionsProblemToGroupedBySimpleVerdict(submission: Submission, groupedProblems: Map<SimpleVerdict, Map<number, Set<string>>>) {
		const verdict = getSimpleVerdict(submission.verdict);
		if (!isDefined(groupedProblems.get(verdict))) {
			groupedProblems.set(verdict, new Map());
		}

		if (!isDefined(groupedProblems.get(verdict)?.get(submission.problem.rating))) {
			groupedProblems.get(verdict)?.set(submission.problem.rating, new Set());
		}

		groupedProblems.get(verdict)?.get(submission.problem.rating)?.add(submission.problem.id);
	}


	return { submissionsByVerdict, problemIDsBySimpleVerdict, theme };
}

export default useStatPage;