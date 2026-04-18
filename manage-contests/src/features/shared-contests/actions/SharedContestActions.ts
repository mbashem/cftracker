"use server";

import { getAllContests } from "@/features/contests/services/ContestDBService";
import { revalidatePath } from "next/cache";
import { createOrUpdateSharedContest, deleteSharedContest } from "../services/SharedContestsDBService";
import groupContestAsShared from "../services/GroupContestService";
import { getGroupedSharedProblems } from "../services/CreateSharedService";
import path from "path";
import { writeFile } from "fs";

export async function deleteSharedContestAction(contestId: number) {
	console.log("Deleting: shared contest, contestID:" + contestId);
	const res = await deleteSharedContest(contestId);
	console.log(res);
	revalidatePath("/shared-contests");
}

export async function createSharedContestAction(parentId: number, childId: number) {
	console.log("Server: Creating shared contest, parentID:" + parentId + " childID:" + childId + ")");
	const res = await createOrUpdateSharedContest(childId, parentId);
	console.log(res);
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
	const filePath = path.join(process.cwd(), "../src/data/saved_api/related.ts");

	const groupedSharedProblems = await getGroupedSharedProblems();
	console.log("filePath: ", filePath);
	const jsonData = "export const jsonData = " + JSON.stringify(groupedSharedProblems);
	writeFile(filePath, jsonData, (err) => {
		if (err) {
			console.error("Error writing file: ", err);
		} else {
			console.log("File written successfully");
		}
	});
}
