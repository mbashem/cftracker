import prismaClient from "@/prisma/prismaClient";
import { Problem, SharedContest } from "@/prisma/generated/client/client";
import { err, isError, ok, Result } from "@/utils/result";

export type CreateOrUpdateSharedContestResult = {
	status: "created" | "unchanged";
	mapping: SharedContest;
};

export type SharedContestGroupDetails = {
	parentContestId: number;
	parentContest: {
		contestId: number;
		name: string;
	};
	contests: Array<{
		contestId: number;
		name: string;
		problems: Problem[];
	}>;
};

export function groupSharedContestsByParent(sharedContests: SharedContest[]) {
	const groups = new Map<number, SharedContest[]>();

	for (const sharedContest of sharedContests) {
		const group = groups.get(sharedContest.parentContestId) ?? [];
		group.push(sharedContest);
		groups.set(sharedContest.parentContestId, group);
	}

	return Array.from(groups.values());
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
	return await prismaClient.sharedContest.findMany({
		orderBy: [
			{ parentContestId: "asc" },
			{ contestId: "asc" }
		]
	});
}

export async function getAllSharedContestGroupByParent() {
	const allContests = await getAllSharedContests();
	return groupSharedContestsByParent(allContests);
}

export async function getAllSharedContestGroupsWithDetails(): Promise<Result<SharedContestGroupDetails[]>> {
	const mappingsResult = await (async () => {
		try {
			const mappings = await prismaClient.sharedContest.findMany({
				select: {
					parentContestId: true,
					parentContest: {
						select: {
							contestId: true,
							name: true
						}
					},
					Contest: {
						select: {
							contestId: true,
							name: true,
							Problem: {
								orderBy: {
									index: "asc"
								}
							}
						}
					}
				},
				orderBy: [
					{ parentContestId: "asc" },
					{ contestId: "asc" }
				]
			});

			return ok(mappings);
		} catch (error) {
			console.error("Failed to load shared contest group details", error);
			return err({
				code: "DATABASE_ERROR",
				publicMessage: "Could not load shared contest groups from the database",
				retryable: true
			});
		}
	})();

	if (isError(mappingsResult)) return mappingsResult;

	const groups = new Map<number, SharedContestGroupDetails>();

	for (const mapping of mappingsResult.value) {
		let group = groups.get(mapping.parentContestId);
		if (!group) {
			group = {
				parentContestId: mapping.parentContestId,
				parentContest: mapping.parentContest,
				contests: []
			};
			groups.set(mapping.parentContestId, group);
		}

		group.contests.push({
			contestId: mapping.Contest.contestId,
			name: mapping.Contest.name,
			problems: mapping.Contest.Problem
		});
	}

	return ok(Array.from(groups.values()));
}

export async function createOrUpdateSharedContest(
	contestId: number,
	parentContestId: number
): Promise<Result<CreateOrUpdateSharedContestResult>> {
	if (!Number.isSafeInteger(parentContestId) || parentContestId <= 0 || !Number.isSafeInteger(contestId) || contestId <= 0) {
		return err({
			code: "INVALID_CONTEST_ID",
			publicMessage: "parentContestId and contestId must be positive integers",
			retryable: false
		});
	}

	if (parentContestId > contestId) {
		return err({
			code: "INVALID_PARENT_ORDER",
			publicMessage: `Parent contest ${parentContestId} cannot be greater than contest ${contestId}`,
			retryable: false
		});
	}

	try {
		return await prismaClient.$transaction(async (transaction): Promise<Result<CreateOrUpdateSharedContestResult>> => {
			const contests = await transaction.contest.findMany({
				where: {
					contestId: {
						in: parentContestId === contestId ? [contestId] : [parentContestId, contestId]
					}
				},
				select: {
					contestId: true
				}
			});

			const expectedContestCount = parentContestId === contestId ? 1 : 2;
			if (contests.length !== expectedContestCount) {
				const foundIds = new Set(contests.map((contest) => contest.contestId));
				const missingIds = [parentContestId, contestId]
					.filter((id, index, ids) => ids.indexOf(id) === index)
					.filter((id) => !foundIds.has(id));
				return err({
					code: "CONTEST_NOT_FOUND",
					publicMessage: `Contest${missingIds.length === 1 ? "" : "s"} not found: ${missingIds.join(", ")}`,
					retryable: false
				});
			}

			const existingMapping = await transaction.sharedContest.findUnique({
				where: {
					contestId
				}
			});

			if (existingMapping && existingMapping.parentContestId !== parentContestId) {
				return err({
					code: "MAPPING_CONFLICT",
					publicMessage: `Contest ${contestId} is already linked to parent ${existingMapping.parentContestId}`,
					retryable: false
				});
			}

			if (contestId !== parentContestId) {
				const parentMapping = await transaction.sharedContest.findUnique({
					where: {
						contestId: parentContestId
					}
				});

				if (!parentMapping || parentMapping.parentContestId !== parentContestId) {
					return err({
						code: "PARENT_NOT_INITIALIZED",
						publicMessage: `Parent contest ${parentContestId} must be linked to itself first`,
						retryable: false
					});
				}

				const childOfContest = await transaction.sharedContest.findFirst({
					where: {
						parentContestId: contestId,
						contestId: {
							not: contestId
						}
					},
					select: {
						contestId: true
					}
				});

				if (childOfContest) {
					return err({
						code: "NESTED_PARENT_CONFLICT",
						publicMessage: `Contest ${contestId} already acts as a parent for contest ${childOfContest.contestId}`,
						retryable: false
					});
				}
			}

			if (existingMapping) {
				return ok({
					status: "unchanged" as const,
					mapping: existingMapping
				});
			}

			const mapping = await transaction.sharedContest.upsert({
				where: {
					contestId
				},
				create: {
					parentContestId,
					contestId
				},
				update: {}
			});

			return ok({
				status: "created" as const,
				mapping
			});
		}, {
			isolationLevel: "Serializable"
		});
	} catch (error) {
		console.error("Failed to create or update a shared contest", error);
		return err({
			code: "DATABASE_ERROR",
			publicMessage: "Could not update the shared contest mapping in the database",
			retryable: true
		});
	}
}

export async function deleteAllSharedContests() {
	return await prismaClient.sharedContest.deleteMany({});
}
