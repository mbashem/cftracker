import prismaClient from "@/prisma/prismaClient";
import { getAllContestsFromCF } from "@/features/cf-api/CFApiService";
import { Contest } from "@/prisma/generated/client/client";
import { err, isError, ok, Result } from "@/utils/result";

export async function createOrUpdateContest(
	contestId: number,
	name: string
): Promise<Result<Contest>> {
	try {
		const contest = await prismaClient.contest.upsert({
			where: {
				contestId: contestId
			},
			update: {
				name: name
			},
			create: {
				contestId: contestId,
				name: name
			}
		});

		return ok(contest);
	} catch (error) {
		console.error("[ContestDBService.createOrUpdateContest] Prisma operation failed", error);
		return err({
			code: "DATABASE_ERROR",
			publicMessage: "Could not save the contest.",
			retryable: true
		});
	}
}

export async function getContest(contestId: number) {
	return await prismaClient.contest.findUnique({
		where: {
			contestId: contestId
		}
	});
}

export async function deleteContest(contestId: number) {
	const res = await prismaClient.contest.delete({
		where: {
			contestId: contestId
		}
	});
	return res;
}

export async function getAllContests() {
	return await prismaClient.contest.findMany({
		orderBy: {
			contestId: "asc"
		}
	});
}

export async function getAllUngroupedContests(): Promise<Result<Contest[]>> {
	try {
		const contests = await prismaClient.contest.findMany({
			where: {
				SharedContest: {
					none: {}
				}
			},
			orderBy: {
				contestId: "asc"
			}
		});

		return ok(contests);
	} catch (error) {
		console.error("[ContestDBService.getAllUngroupedContests] Prisma operation failed", error);
		return err({
			code: "DATABASE_ERROR",
			publicMessage: "Could not load ungrouped contests.",
			retryable: true
		});
	}
}

export async function fetchAndSaveAllContests(
	gym = false
): Promise<Result<Contest[]>> {
	const contestsResult = await getAllContestsFromCF(gym);
	if (isError(contestsResult)) return contestsResult;

	const contestsList: Contest[] = [];

	for (const contest of contestsResult.value) {
		const createdContestResult = await createOrUpdateContest(contest.id, contest.name);
		if (isError(createdContestResult)) return createdContestResult;

		contestsList.push(createdContestResult.value);
	}

	return ok(contestsList);
}

export async function deleteAllContests() {
	return await prismaClient.contest.deleteMany({});
}
