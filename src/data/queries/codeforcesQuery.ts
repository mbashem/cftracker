import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta, QueryReturnValue } from '@reduxjs/toolkit/query';
import { IS_DEBUG_MODE } from '../../util/env';
import {
	CodeforcesContestListState,
	ContestListResult,
	normalizeContestResult,
	normalizeProblemResult,
	ProblemListState,
	ProblemSetResult
} from './codeforcesApiResponse';

export const codeforcesApi = createApi({
	reducerPath: 'codeforcesApi',
	baseQuery: fetchBaseQuery({ baseUrl: "https://codeforces.com/api/" }),
	endpoints: (builder) => ({
		getProblems: builder.query<ProblemListState, void>({
			queryFn: (_arg, _queryApi, _extraOptions, baseQuery) => getProblems(baseQuery),
		}),
		getContest: builder.query<CodeforcesContestListState, void>({
			queryFn: () => getContest(),
		}),
	}),
});

type MaybePromise<T> = T | PromiseLike<T>;
type CodeforcesBaseQuery = (arg: string | FetchArgs) => MaybePromise<QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>>;
type CodeforcesQueryResult<T> = { data: T; } | { error: FetchBaseQueryError; };

const problemSetPath = "problemset.problems?lang=en";
async function getProblems(baseQuery: CodeforcesBaseQuery): Promise<CodeforcesQueryResult<ProblemListState>> {
	try {
		if (IS_DEBUG_MODE) return getSavedProblems();

		const response = await baseQuery({ url: problemSetPath, method: 'GET' });
		if (response.error) return { error: response.error };

		return { data: normalizeProblemResult(response.data as ProblemSetResult) };
	} catch (error) {
		console.log(error);
		return codeforcesError(IS_DEBUG_MODE ? "Failed to load saved Problems list." : "Failed to fetch Problems list from CF API.");
	}
}

async function getContest(): Promise<CodeforcesQueryResult<CodeforcesContestListState>> {
	try {
		return getSavedContest();
	} catch (error) {
		console.log(error);
		return codeforcesError("Failed to load saved contestList.");
	}
}

async function getSavedProblems(): Promise<CodeforcesQueryResult<ProblemListState>> {
	console.log("CFTracker is running in debug mode. Using local saved problems data.");
	const data = await import("../saved_api/problems_data");
	return { data: normalizeProblemResult(data.problem_data as ProblemSetResult) };
}

async function getSavedContest(): Promise<CodeforcesQueryResult<CodeforcesContestListState>> {
	const data = await import("../saved_api/contests_data");
	return { data: normalizeContestResult(data.contests_data as ContestListResult) };
}

function codeforcesError(error: string): CodeforcesQueryResult<never> {
	return {
		error: {
			status: "CUSTOM_ERROR",
			error,
		},
	};
}
