import prismaClient from "@/prisma/prismaClient";

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