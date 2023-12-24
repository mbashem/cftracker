import prismaClient from "@/prisma/prismaClient";

export async function createOrUpdateContest(contestId: number, name: string) {
	if (await getContest(contestId)) {
		return await prismaClient.contest.update({
			where: {
				contestId: contestId
			},
			data: {
				name: name
			}
		});
	}
	const res = await prismaClient.contest.create({
		data: {
			contestId: contestId,
			name: name
		}
	});
	return res;
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
	})
	return res;
}

export async function getAllContests() {
	return await prismaClient.contest.findMany();
}