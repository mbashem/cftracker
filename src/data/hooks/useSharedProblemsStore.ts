import { useMemo } from "react";
import { codeforcesApi } from "../queries/codeforcesQuery";
import { SharedProblemListState } from "../queries/codeforcesApiResponse";

const emptySharedProblems: SharedProblemListState["problems"] = [];

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

	const sharedProblems = useMemo<SharedProblemListState>(() => ({
		problems: data?.problems ?? emptySharedProblems,
		error: getSharedProblemErrorMessage(error) ?? data?.error,
		loading: isLoading || (data?.loading ?? false),
	}), [data, error, isLoading]);

	return {
		sharedProblems,
		isSharedProblemsLoading: sharedProblems.loading,
		sharedProblemsError: sharedProblems.error,
	};
}

export default useSharedProblemsStore;
