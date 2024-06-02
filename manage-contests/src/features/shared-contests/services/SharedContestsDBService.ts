import prismaClient from "@/prisma/prismaClient";

export async function createOrUpdateSharedContest(contestId: number, parentId: number) {
	if (await getSharedContest(contestId)) {
		return await prismaClient.sharedContest.update({
			where: {
				contestId: contestId
			},
			data: {
				parentContestId: parentId
			}
		});
	}
	const res = await prismaClient.sharedContest.create({
		data: {
			contestId: contestId,
			parentContestId: parentId
		}
	});
	return res;
}

export async function deleteSharedContest(contestId: number) {
	const res = await prismaClient.sharedContest.delete({
		where: {
			contestId: contestId
		}
	})
	return res;
}

export async function getSharedContestByParent(parentContest: number) {
	const res = await prismaClient.sharedContest.findMany({
		where: {
			parentContestId: parentContest
		}
	})

	return res;
}

export async function getSharedContest(contestId: number) {
	const res = await prismaClient.sharedContest.findUnique({
		where: {
			contestId: contestId
		}
	});

	return res;
}

export async function getAllSharedContests() {
	return await prismaClient.sharedContest.findMany();
}

export async function getAllSharedContestGroupByParent() {
	const allContests = await getAllSharedContests();
	console.log("Here");
	return (await prismaClient.sharedContest.groupBy({
		by: ["parentContestId"],
		orderBy: {
			parentContestId: "desc"
		}
	})).map((item) => {
		return allContests.filter((contest) => {
			return contest.parentContestId == item.parentContestId;
		});
	});
}

export async function deleteAllSharedContests() {
	return await prismaClient.sharedContest.deleteMany({});
}