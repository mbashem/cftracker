import { getContestWithProblemByIdFromCF } from "@/features/cf-api/CFApiService";
import prismaClient from "@/prisma/prismaClient";
import { Contest } from "@prisma/client";

export async function createOrUpdateProblem(contestId: number, index: string, name: string) {
	if (await getProblem(contestId, index)) {
		return await prismaClient.problem.updateMany({
			where: {
				contestId: contestId,
				index: index
			},
			data: {
				name: name
			}
		});
	}
	const res = await prismaClient.problem.create({
		data: {
			contestId: contestId,
			index: index,
			name: name
		}
	});
	return res;
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
	})
	return res;
}

export async function getAllProblems() {
	return await prismaClient.problem.findMany();
}

export async function fetchAndSaveProblems(contests: Contest[]) {
	for (const contest of contests) {
		const { problems } = await getContestWithProblemByIdFromCF(contest.contestId);
		for (const problem of problems) {
			await createOrUpdateProblem(contest.contestId, problem.index, problem.name);
		}

		await sleep(2000);
	}
}

export async function getFetchedProblemsContestIdList() {
	return (await prismaClient.problem.findMany({
		select: {
			contestId: true,
		},
		distinct: ['contestId'],
	})).map(item => item.contestId);
}