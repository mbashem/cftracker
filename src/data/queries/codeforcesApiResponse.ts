import Contest from "../../types/CF/Contest";
import Problem, { ProblemStatistics } from "../../types/CF/Problem";
import { sortByContestId } from "../../util/sortMethods";

export interface ProblemListState {
	problems: Problem[];
	error: string | undefined;
	tags: string[];
	loading: boolean;
}

export interface CodeforcesContestListState {
	contests: Contest[];
	error: string | undefined;
	loading: boolean;
}

export interface ProblemSetResult {
	status: string;
	result: {
		problems: Problem[];
		problemStatistics: ProblemStatistics[];
	};
}

export interface ContestListResult {
	status: string;
	result: ContestResultItem[];
}

interface ContestResultItem {
	id?: number;
	name: string;
	type?: string;
	phase: string;
	durationSeconds?: number;
	startTimeSeconds?: number;
}

export function normalizeProblemResult(result: ProblemSetResult): ProblemListState {
	if (result.status !== "OK") throw new Error("Failed to fetch Problems list from CF API");

	let problems = result.result.problems;
	let problemStatistics = result.result.problemStatistics;

	problems = problems.filter((problem) => problem.contestId ? true : false);
	problemStatistics = problemStatistics.filter((problem) => problem.contestId ? true : false);

	const finalProblemArray: Problem[] = [];
	for (let index = 0; index < problems.length; index++) {
		problems[index].rating = problems[index].rating ?? 0;
		problems[index].solvedCount = problems[index].solvedCount ?? 0;
		if (problems[index].contestId === undefined) continue;
		finalProblemArray.push(
			new Problem(
				problems[index].contestId!,
				problems[index].index,
				problems[index].name,
				problems[index].type,
				problems[index].rating,
				problems[index].tags,
				problemStatistics[index]?.solvedCount ?? 0
			)
		);
	}

	finalProblemArray.sort(sortByContestId);

	const tags = new Set<string>();
	for (const problem of finalProblemArray)
		for (const tag of problem.tags) tags.add(tag);

	return {
		problems: finalProblemArray,
		error: undefined,
		tags: Array.from(tags),
		loading: false,
	};
}

export function normalizeContestResult(result: ContestListResult): CodeforcesContestListState {
	if (result.status !== "OK") throw new Error("Failed to load saved contestList");

	const contests: Contest[] = [];

	for (const contest of result.result) {
		if (contest.id)
			contests.push(
				new Contest(
					contest.id,
					contest.name,
					contest.type,
					contest.phase,
					contest.durationSeconds,
					contest.startTimeSeconds
				)
			);
	}

	return {
		contests,
		error: undefined,
		loading: false,
	};
}
