"use server";

import { getAllContests } from "@/features/contests/services/ContestDBService";
import { isError } from "@/utils/result";
import { revalidatePath } from "next/cache";
import { createOrUpdateSharedContest, deleteSharedContest } from "../services/SharedContestsDBService";
import groupContestAsShared from "../services/GroupContestService";
import { writeRelatedTs } from "../services/RelatedFileService";

export async function deleteSharedContestAction(contestId: number) {
	console.log("Deleting: shared contest, contestID:" + contestId);
	const res = await deleteSharedContest(contestId);
	console.log(res);
	revalidatePath("/shared-contests");
}

export async function createSharedContestAction(parentId: number, childId: number) {
	console.log("Server: Creating shared contest, parentID:" + parentId + " childID:" + childId + ")");
	const result = await createOrUpdateSharedContest(childId, parentId);
	if (isError(result)) {
		console.error("Unable to create shared contest", result.error);
		return;
	}

	console.log(result.value);
	revalidatePath("/shared-contests");
}

export async function groupContestsAction() {
	console.log("Server: Grouping contests");

	const contestList = await getAllContests();
	await groupContestAsShared(contestList);
	revalidatePath("/shared-contests");
};

export async function saveSharedContestsToFileAction() {
	console.log("Server: Saving shared contests to file");
	const result = await writeRelatedTs();
	if (isError(result)) {
		console.error("Unable to save the related contests file", result.error);
		return;
	}

	console.log(`Related contests file written: ${result.value.outputPath}`);
}
