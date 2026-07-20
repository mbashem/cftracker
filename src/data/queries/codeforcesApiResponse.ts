import {
	ProblemData,
	ProblemLiteData,
	ProblemSharedData,
} from "../../types/CF/Problem";
import { sortByContestId } from "../../util/sortMethods";

export interface ContestData {
	id: number;
	name: string;
	type?: string;
	phase: string;
	durationSeconds?: number;
	startTimeSeconds?: number;
}

export interface ProblemSetResult {
	status: string;
	result: {
		problems: ProblemResultItem[];
		problemStatistics: ProblemStatisticsResultItem[];
	};
}

export interface ContestListResult {
	status: string;
	result: ContestResultItem[];
}

export interface SharedProblemListResult {
	status: string;
	result: SharedProblemResultItem[];
}

interface ProblemResultItem {
	contestId?: number;
	index: string;
	name: string;
	type: string;
	rating?: number;
	tags: string[];
}

interface ProblemStatisticsResultItem {
	contestId?: number;
	index: string;
	solvedCount: number;
}

interface ContestResultItem {
	id?: number;
	name: string;
	type?: string;
	phase: string;
	durationSeconds?: number;
	startTimeSeconds?: number;
}

interface SharedProblemResultItem {
	contestId?: number;
	index: string;
	shared?: SharedProblemLiteResultItem[];
}

interface SharedProblemLiteResultItem {
	contestId?: number;
	index: string;
}

export function normalizeProblemResult(result: ProblemSetResult): ProblemData[] {
	if (result.status !== "OK") throw new Error("Failed to fetch Problems list from CF API");

	const problems = result.result.problems.filter(hasContestId);
	const problemStatistics = result.result.problemStatistics.filter(hasContestId);
	const finalProblemArray: ProblemData[] = [];

	for (let index = 0; index < problems.length; index++) {
		const problem = problems[index];
		finalProblemArray.push({
			contestId: problem.contestId,
			index: problem.index,
			name: problem.name,
			type: problem.type,
			rating: problem.rating ?? 0,
			tags: [...problem.tags],
			solvedCount: problemStatistics[index]?.solvedCount ?? 0,
		});
	}

	finalProblemArray.sort(sortByContestId);

	return finalProblemArray;
}

export function normalizeContestResult(result: ContestListResult): ContestData[] {
	if (result.status !== "OK") throw new Error("Failed to load saved contestList");

	const contests: ContestData[] = [];

	for (const contest of result.result) {
		if (contest.id === undefined) continue;

		contests.push({
			id: contest.id,
			name: contest.name,
			type: contest.type,
			phase: contest.phase,
			durationSeconds: contest.durationSeconds,
			startTimeSeconds: contest.startTimeSeconds,
		});
	}

	return contests;
}

export function normalizeSharedProblemResult(result: SharedProblemListResult): ProblemSharedData[] {
	if (result.status !== "OK") throw new Error("Error fetching shared problems api call failed");

	const sharedProblems: ProblemSharedData[] = [];

	for (const shared of result.result) {
		if (shared.contestId === undefined) continue;

		const relatedProblems: ProblemLiteData[] = [];
		for (const problem of shared.shared ?? []) {
			if (problem.contestId === undefined) continue;
			relatedProblems.push({ contestId: problem.contestId, index: problem.index });
		}

		sharedProblems.push({
			contestId: shared.contestId,
			index: shared.index,
			shared: relatedProblems,
		});
	}

	return sharedProblems.sort(sortByContestId);
}

function hasContestId<T extends { contestId?: number }>(
	value: T
): value is T & { contestId: number } {
	return value.contestId !== undefined;
}
