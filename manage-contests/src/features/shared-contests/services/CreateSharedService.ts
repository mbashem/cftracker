import { SharedContest } from "@/prisma/generated/client/client";
import prismaClient from "@/prisma/prismaClient";
import { err, isError, ok, Result } from "@/utils/result";
import { ProblemShared, ProblemType } from "../types/ProblemShared";
import { groupSharedContestsByParent } from "./SharedContestsDBService";

export type RelatedProblemReference = {
	contestId: number;
	index: string;
	id: string;
};

export type RelatedProblem = RelatedProblemReference & {
	shared: RelatedProblemReference[];
};

export function createShared(problems: ProblemType[], sharedContests: SharedContest[][]): ProblemShared[] {
	const result: ProblemShared[] = [];
	const contestRelations = new Map<number, Set<number>>();

	for (const contests of sharedContests) {
		const contestIds = contests.map((contest) => contest.contestId);

		for (const contestId of contestIds) {
			for (const relatedContestId of contestIds) {
				if (contestId === relatedContestId) continue;

				const relatedContestIds = contestRelations.get(contestId) ?? new Set<number>();
				relatedContestIds.add(relatedContestId);
				contestRelations.set(contestId, relatedContestIds);
			}
		}
	}

	for (let problemIndex = 0; problemIndex < problems.length; problemIndex++) {
		const problem = new ProblemShared(
			problems[problemIndex].contestId,
			problems[problemIndex].index,
			problems[problemIndex].name,
			undefined,
			problems[problemIndex].rating
		);

		for (let candidateIndex = 0; candidateIndex < problems.length; candidateIndex++) {
			if (
				problemIndex !== candidateIndex
				&& problems[problemIndex].name === problems[candidateIndex].name
				&& problems[problemIndex].rating === problems[candidateIndex].rating
				&& contestRelations.get(problems[problemIndex].contestId)?.has(problems[candidateIndex].contestId)
			) {
				problem.shared.push(problems[candidateIndex]);
			}
		}

		if (problem.shared.length) result.push(problem);
	}

	return result;
}

function compareProblemIdentity(
	left: Pick<RelatedProblemReference, "contestId" | "index">,
	right: Pick<RelatedProblemReference, "contestId" | "index">
) {
	if (left.contestId !== right.contestId) return left.contestId - right.contestId;
	if (left.index === right.index) return 0;
	return left.index < right.index ? -1 : 1;
}

export async function getGroupedSharedProblems(): Promise<Result<RelatedProblem[]>> {
	const dataResult = await (async () => {
		try {
			const data = await prismaClient.$transaction(async (transaction) => {
				const problems = await transaction.problem.findMany({
					orderBy: [
						{ contestId: "asc" },
						{ index: "asc" }
					]
				});
				const mappings = await transaction.sharedContest.findMany({
					orderBy: [
						{ parentContestId: "asc" },
						{ contestId: "asc" }
					]
				});

				return { problems, mappings };
			}, {
				isolationLevel: "RepeatableRead"
			});

			return ok(data);
		} catch (error) {
			console.error("Failed to load data used to create related problems", error);
			return err({
				code: "DATABASE_ERROR",
				publicMessage: "Could not load contest and problem data from the database",
				retryable: true
			});
		}
	})();

	if (isError(dataResult)) return dataResult;

	const { problems, mappings } = dataResult.value;
	const sharedContests = groupSharedContestsByParent(mappings);

	const sharedProblems = createShared(problems.map((problem) => ({
		name: problem.name,
		contestId: problem.contestId,
		index: problem.index,
		rating: problem.rating === null ? undefined : problem.rating
	})), sharedContests);

	return ok(sharedProblems
		.map((problem) => problem.toJSON() as RelatedProblem)
		.map((problem) => ({
			...problem,
			shared: [...problem.shared].sort(compareProblemIdentity)
		}))
		.sort(compareProblemIdentity));
}
