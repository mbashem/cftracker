"use server";

import { revalidatePath } from "next/cache";
import { deleteSharedContest } from "../services/SharedContestsDBService";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";

export async function deleteSharedContestAction(contestId: number) {
	console.log("Deleting: shared contest, contestID:" + contestId);
	const res = await deleteSharedContest(contestId);
	console.log(res);
	revalidatePath("/shared-contests");
}

export async function fetchAndSaveProblems(contestId: number) {
	const { problemsList } = await fetchAndSaveProblemsByContestId(contestId);
	console.log(problemsList);
	revalidatePath("/shared-contests");
}