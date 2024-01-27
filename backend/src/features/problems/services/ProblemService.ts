import { getContestWithProblemByIdFromCF } from "@/features/cf-api/CFApiService";
import { createOrUpdateContest } from "@/features/contests/services/ContestDBService";
import { createOrUpdateProblem } from "./ProblemDBService";
import { Problem } from "@prisma/client";

export async function fetchAndSaveProblemsByContestId(contestId: number) {
	const res = await getContestWithProblemByIdFromCF(contestId);

	const insertedContest = await createOrUpdateContest(res.contest.id, res.contest.name);

	const problemsList: Problem[] = [];

	for (const problem of res.problems) {
		const insertedProblem = await createOrUpdateProblem(problem.contestId, problem.index, problem.name);
		problemsList.push(insertedProblem);
	}
	return {
		insertedContest,
		problemsList,
	}
}

