"use server";
import { getContestWithProblemByIdFromCF } from "@/features/cf-api/CFApiService";
import { createOrUpdateContest } from "@/features/contests/services/ContestDBService";
import { createOrUpdateProblem } from "./ProblemDBService";
import scrapProblemsFromContest from "@/scrapper/scrapProblemsFromContest";
import { Contest, Problem } from "@/prisma/generated/client/client";
import { isError, ok, Result } from "@/utils/result";

type SavedContestProblems = Readonly<{
	insertedContest: Contest;
	problemsList: Problem[];
}>;

type SavedProblems = Readonly<{
	problemsList: Problem[];
}>;

export async function fetchAndSaveProblemsByContestId(
	contestId: number
): Promise<Result<SavedContestProblems>> {
	const contestResult = await getContestWithProblemByIdFromCF(contestId);
	if (isError(contestResult)) return contestResult;

	const insertedContestResult = await createOrUpdateContest(
		contestResult.value.contest.id,
		contestResult.value.contest.name
	);
	if (isError(insertedContestResult)) return insertedContestResult;

	const problemsList: Problem[] = [];

	for (const problem of contestResult.value.problems) {
		const insertedProblemResult = await createOrUpdateProblem(
			problem.contestId,
			problem.index,
			problem.name,
			problem.rating
		);
		if (isError(insertedProblemResult)) return insertedProblemResult;

		problemsList.push(insertedProblemResult.value);
	}

	return ok({
		insertedContest: insertedContestResult.value,
		problemsList,
	});
}

export async function scrapAndSaveProblemsByContestId(
	contestId: number
): Promise<Result<SavedProblems>> {
	const problemsResult = await scrapProblemsFromContest(contestId);
	if (isError(problemsResult)) return problemsResult;

	console.log("Scraped problems: ", problemsResult.value);
	const problemsList: Problem[] = [];

	for (const problem of problemsResult.value) {
		const insertedProblemResult = await createOrUpdateProblem(
			problem.contestId,
			problem.index,
			problem.name,
			problem.rating === null ? undefined : problem.rating
		);
		if (isError(insertedProblemResult)) return insertedProblemResult;

		problemsList.push(insertedProblemResult.value);
	}

	return ok({
		problemsList,
	});
}
