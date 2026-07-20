import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta, QueryReturnValue } from '@reduxjs/toolkit/query';
import { IS_DEBUG_MODE } from '../../util/env';
import { ProblemData, ProblemSharedData } from '../../types/CF/Problem';
import {
	ContestData,
	ContestListResult,
	normalizeContestResult,
	normalizeProblemResult,
	normalizeSharedProblemResult,
	ProblemSetResult,
	SharedProblemListResult,
} from './codeforcesApiResponse';

export const codeforcesApi = createApi({
	reducerPath: 'codeforcesApi',
	baseQuery: fetchBaseQuery({ baseUrl: "https://codeforces.com/api/" }),
	endpoints: (builder) => ({
		getProblems: builder.query<ProblemData[], void>({
			queryFn: (_arg, _queryApi, _extraOptions, baseQuery) => getProblems(baseQuery),
		}),
		getContest: builder.query<ContestData[], void>({
			queryFn: () => getContest(),
		}),
		getSharedProblems: builder.query<ProblemSharedData[], void>({
			queryFn: () => getSharedProblems(),
		}),
	}),
});

type MaybePromise<T> = T | PromiseLike<T>;
type CodeforcesBaseQuery = (arg: string | FetchArgs) => MaybePromise<QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>>;
type CodeforcesQueryResult<T> = { data: T; } | { error: FetchBaseQueryError; };

const problemSetPath = "problemset.problems?lang=en";
async function getProblems(baseQuery: CodeforcesBaseQuery): Promise<CodeforcesQueryResult<ProblemData[]>> {
	try {
		if (IS_DEBUG_MODE) return { data: await getSavedProblems() };

		const response = await baseQuery({ url: problemSetPath, method: 'GET' });
		if (response.error) return { error: response.error };

		return { data: normalizeProblemResult(response.data as ProblemSetResult) };
	} catch (error) {
		console.log(error);
		return codeforcesError(IS_DEBUG_MODE ? "Failed to load saved Problems list." : "Failed to fetch Problems list from CF API.");
	}
}

async function getContest(): Promise<CodeforcesQueryResult<ContestData[]>> {
	try {
		return { data: await getSavedContest() };
	} catch (error) {
		console.log(error);
		return codeforcesError("Failed to load saved contestList.");
	}
}

async function getSharedProblems(): Promise<CodeforcesQueryResult<ProblemSharedData[]>> {
	try {
		return { data: await getSavedSharedProblems() };
	} catch (error) {
		console.log(error);
		return codeforcesError("Error processing shared problems");
	}
}

async function getSavedProblems(): Promise<ProblemData[]> {
	console.log("CFTracker is running in debug mode. Using local saved problems data.");
	const data = await import("../saved_api/problems_data");
	return normalizeProblemResult(data.problem_data as ProblemSetResult);
}

async function getSavedContest(): Promise<ContestData[]> {
	const data = await import("../saved_api/contests_data");
	return normalizeContestResult(data.contests_data as ContestListResult);
}

async function getSavedSharedProblems(): Promise<ProblemSharedData[]> {
	const data = await import("../saved_api/related");
	return normalizeSharedProblemResult(data.jsonData as SharedProblemListResult);
}

function codeforcesError(error: string): CodeforcesQueryResult<never> {
	return {
		error: {
			status: "CUSTOM_ERROR",
			error,
		},
	};
}
