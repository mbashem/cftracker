import type { Contest, Problem } from "@/prisma/generated/client/client";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { err, isError, ok, type AppError, type Result } from "@/utils/result";
import { sleep } from "@/utils/utils";
import {
	createOrUpdateSharedContest,
	type CreateOrUpdateSharedContestResult
} from "./SharedContestsDBService";

export const SHARED_CONTEST_PROBLEM_SYNC_DELAY_MS = 2000;

export type SyncSharedContestGroupResult = Readonly<{
	parentContestId: number;
	contestIds: number[];
	mappings: CreateOrUpdateSharedContestResult[];
	synchronizedContests: Array<{
		contest: Contest;
		problemCount: number;
		problems: Problem[];
	}>;
	totalProblemCount: number;
}>;

export type SyncSharedContestGroupDependencies = Readonly<{
	linkContest: typeof createOrUpdateSharedContest;
	syncContestProblems: typeof fetchAndSaveProblemsByContestId;
	wait: (milliseconds: number) => Promise<void>;
}>;

const defaultSyncSharedContestGroupDependencies: SyncSharedContestGroupDependencies = {
	linkContest: createOrUpdateSharedContest,
	syncContestProblems: fetchAndSaveProblemsByContestId,
	wait: sleep
};

function operationError(error: AppError, context: string) {
	return err({
		...error,
		publicMessage: `${context}: ${error.publicMessage}`
	});
}

export async function syncSharedContestGroup(
	contestIds: readonly number[],
	requestedParentContestId?: number,
	dependencies = defaultSyncSharedContestGroupDependencies
): Promise<Result<SyncSharedContestGroupResult>> {
	if (
		contestIds.length === 0
		|| contestIds.some((contestId) => !Number.isSafeInteger(contestId) || contestId <= 0)
		|| new Set(contestIds).size !== contestIds.length
	) {
		return err({
			code: "INVALID_CONTEST_ID",
			publicMessage: "contestIds must contain at least one unique positive integer",
			retryable: false
		});
	}
	if (requestedParentContestId !== undefined && (
		!Number.isSafeInteger(requestedParentContestId) || requestedParentContestId <= 0
	)) {
		return err({
			code: "INVALID_CONTEST_ID",
			publicMessage: "parentContestId must be a positive integer",
			retryable: false
		});
	}

	const orderedContestIds = [...contestIds].toSorted((left, right) => left - right);
	const parentContestId = requestedParentContestId ?? orderedContestIds[0];
	const mappings: CreateOrUpdateSharedContestResult[] = [];

	for (const contestId of orderedContestIds) {
		const mappingResult = await dependencies.linkContest(contestId, parentContestId);
		if (isError(mappingResult)) {
			return operationError(
				mappingResult.error,
				`Could not link contest ${contestId} to shared parent ${parentContestId}`
			);
		}

		mappings.push(mappingResult.value);
	}

	const synchronizedContests: SyncSharedContestGroupResult["synchronizedContests"] = [];
	let totalProblemCount = 0;

	for (const contestId of orderedContestIds) {
		await dependencies.wait(SHARED_CONTEST_PROBLEM_SYNC_DELAY_MS);
		const problemsResult = await dependencies.syncContestProblems(contestId);
		if (isError(problemsResult)) {
			return operationError(
				problemsResult.error,
				`Could not synchronize problems for contest ${contestId}`
			);
		}

		const problems = problemsResult.value.problemsList
			.toSorted((left, right) => left.index.localeCompare(right.index));
		totalProblemCount += problems.length;
		synchronizedContests.push({
			contest: problemsResult.value.insertedContest,
			problemCount: problems.length,
			problems
		});
	}

	return ok({
		parentContestId,
		contestIds: orderedContestIds,
		mappings,
		synchronizedContests,
		totalProblemCount
	});
}

const check = (child_name: string, parent_name: string): boolean => {
	// if (name1.includes(name2)) return true;
	// else {
	let p_name = `${parent_name}`;
	let c_name = `${child_name}`;

	p_name = p_name.replace(/\s/g, "");
	c_name = c_name.replace(/\s/g, "");

	const div1 = "Div.1";
	const div2 = "Div.2";

	if (c_name.includes(div2)) {
		c_name = c_name.replace(div2, div1);
	}

	return (c_name === p_name);
};

/**
 * 
 * Will consider div. 1 as parent contest and div. 2 as child contest.
 * Doesn't cover all cases
 */
const groupContestAsShared = async (contests: Contest[]): Promise<void> => {
	console.log("HHHH");
	console.log(contests);

	for (let i = 0; i < contests.length; i++) {
		const curr: Contest[] = [];

		for (let j = 0; j < contests.length; j++) {
			if (
				i !== j && check(contests[j].name, contests[i].name)
			) {
				curr.push(contests[j]);
			}
		}

		//console.log(curr);

		if (curr.length !== 0) {
			const parentResult = await createOrUpdateSharedContest(contests[i].contestId, contests[i].contestId);
			if (isError(parentResult)) {
				throw new Error(parentResult.error.publicMessage);
			}

			for (const cont of curr) {
				const childResult = await createOrUpdateSharedContest(cont.contestId, contests[i].contestId);
				if (isError(childResult)) {
					throw new Error(childResult.error.publicMessage);
				}
			}
		}
	}
};

export default groupContestAsShared;
