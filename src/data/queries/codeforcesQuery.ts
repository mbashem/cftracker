import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta, QueryReturnValue } from '@reduxjs/toolkit/query';
import { IS_DEBUG_MODE } from '../../util/env';
import savedProblemsUrl from '../saved_api/problems_data.json?url';
import savedContestsUrl from '../saved_api/contests_data.json?url';
import savedRelatedUrl from '../saved_api/related.json?url';
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
			queryFn: (_arg, _queryApi, _extraOptions, baseQuery) => getContest(baseQuery),
		}),
		getSharedProblems: builder.query<ProblemSharedData[], void>({
			queryFn: (_arg, _queryApi, _extraOptions, baseQuery) => getSharedProblems(baseQuery),
		}),
	}),
});

type MaybePromise<T> = T | PromiseLike<T>;
type CodeforcesBaseQuery = (arg: string | FetchArgs) => MaybePromise<QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>>;
type CodeforcesQueryResult<T> = { data: T; } | { error: FetchBaseQueryError; };

const problemSetPath = "problemset.problems?lang=en";
async function getProblems(baseQuery: CodeforcesBaseQuery): Promise<CodeforcesQueryResult<ProblemData[]>> {
	try {
		if (IS_DEBUG_MODE) console.log("CFTracker is running in debug mode. Using local saved problems data.");
		const url = IS_DEBUG_MODE
			? new URL(savedProblemsUrl, window.location.href).href
			: problemSetPath;
		const response = await baseQuery({ url, method: 'GET' });
		if (response.error) return { error: response.error };

		return { data: normalizeProblemResult(response.data as ProblemSetResult) };
	} catch (error) {
		console.log(error);
		return codeforcesError(IS_DEBUG_MODE ? "Failed to load saved Problems list." : "Failed to fetch Problems list from CF API.");
	}
}

async function getContest(baseQuery: CodeforcesBaseQuery): Promise<CodeforcesQueryResult<ContestData[]>> {
	try {
		const response = await baseQuery({ url: new URL(savedContestsUrl, window.location.href).href, method: 'GET' });
		if (response.error) return { error: response.error };
		return { data: normalizeContestResult(response.data as ContestListResult) };
	} catch (error) {
		console.log(error);
		return codeforcesError("Failed to load saved contestList.");
	}
}

async function getSharedProblems(baseQuery: CodeforcesBaseQuery): Promise<CodeforcesQueryResult<ProblemSharedData[]>> {
	try {
		const response = await baseQuery({ url: new URL(savedRelatedUrl, window.location.href).href, method: 'GET' });
		if (response.error) return { error: response.error };
		return { data: normalizeSharedProblemResult(response.data as SharedProblemListResult) };
	} catch (error) {
		console.log(error);
		return codeforcesError("Error processing shared problems");
	}
}

function codeforcesError(error: string): CodeforcesQueryResult<never> {
	return {
		error: {
			status: "CUSTOM_ERROR",
			error,
		},
	};
}
