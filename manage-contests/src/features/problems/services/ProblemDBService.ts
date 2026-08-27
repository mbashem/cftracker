"use server";

import { getContestWithProblemByIdFromCF } from "@/features/cf-api/CFApiService";
import prismaClient from "@/prisma/prismaClient";
import { sleep } from "@/utils/utils";
import { Contest, Problem } from "@/prisma/generated/client/client";
import { err, isError, ok, Result } from "@/utils/result";

export async function createOrUpdateProblem(
	contestId: number,
	index: string,
	name: string,
	rating?: number
): Promise<Result<Problem>> {
	try {
		const problem = await prismaClient.problem.upsert({
			where: {
				contestId_index: {
					contestId,
					index
				}
			},
			create: {
				contestId,
				index,
				name,
				rating: rating ?? null
			},
			update: {
				name,
				...(rating === undefined ? {} : { rating })
			}
		});

		return ok(problem);
	} catch (cause) {
		console.error("Failed to create or update problem", cause);
		return err({
			code: "DATABASE_ERROR",
			publicMessage: "Unable to save the problem.",
			retryable: true
		});
	}
}

export async function getProblemsByContestId(contestId: number) {
	return await prismaClient.problem.findMany({
		where: {
			contestId: contestId
		},
		orderBy: {
			index: "asc"
		}
	});
}

export async function getProblem(contestId: number, index: string) {
	return await prismaClient.problem.findFirst({
		where: {
			contestId: contestId,
			index: index
		}
	});
}

export async function deleteProblem(contestId: number, index: string) {
	const res = await prismaClient.problem.deleteMany({
		where: {
			contestId: contestId,
			index: index
		}
	});
	return res;
}

export async function getAllProblems(): Promise<Result<Problem[]>> {
	try {
		const problems = await prismaClient.problem.findMany({
			orderBy: [
				{ contestId: "asc" },
				{ index: "asc" }
			]
		});

		return ok(problems);
	} catch (cause) {
		console.error("Failed to get all problems", cause);
		return err({
			code: "DATABASE_ERROR",
			publicMessage: "Unable to load problems.",
			retryable: true
		});
	}
}

export async function fetchAndSaveProblems(contests: Contest[]): Promise<Result<void>> {
	for (const contest of contests) {
		const contestResult = await getContestWithProblemByIdFromCF(contest.contestId);
		if (isError(contestResult)) return contestResult;

		for (const problem of contestResult.value.problems) {
			const problemResult = await createOrUpdateProblem(
				contest.contestId,
				problem.index,
				problem.name
			);
			if (isError(problemResult)) return problemResult;
		}

		await sleep(2000);
	}

	return ok(undefined);
}

export async function getFetchedProblemsContestIdList() {
	return (await prismaClient.problem.findMany({
		select: {
			contestId: true,
		},
		distinct: ['contestId'],
	})).map(item => item.contestId);
}

export async function deleteAllProblems() {
	return await prismaClient.problem.deleteMany({});
}
