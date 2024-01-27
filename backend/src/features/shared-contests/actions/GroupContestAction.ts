"use server";
import { getAllContests } from "@/features/contests/services/ContestDBService";
import groupContestAsShared from "@/features/shared-contests/services/GroupContestService"
import { createOrUpdateSharedContest } from "../services/SharedContestsDBService";
import { revalidatePath } from "next/cache";

export async function groupContests() {
	console.log("Server: Grouping contests");

	const contestList = await getAllContests();
	await groupContestAsShared(contestList);
	revalidatePath("/shared-contests");
};

export async function createSharedContest(parentId: number, childId: number) {
	console.log("Server: Creating shared contest, parentID:" + parentId + " childID:" + childId + ")");
	const res = await createOrUpdateSharedContest(childId, parentId);
	console.log(res);
	revalidatePath("/shared-contests");
}