"use server"

import { createOrUpdateProblem } from "@/features/problems/services/ProblemDBService";
import { fetchAndSaveProblemsByContestId, scrapAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { revalidatePath } from "next/dist/server/web/spec-extension/revalidate";

export async function addProblemAction(contestId: number, index: string, name: string, rating: number | undefined = undefined) {
	console.log("Adding problem: ", { contestId, index, name });
	
	try {	
		const res = await createOrUpdateProblem(contestId, index, name, rating);
		console.log("Added problem: ", res);
	} catch (e) {
		console.log("Error adding problem: ", e);
	}
	// const res = await addProblemToContest(contestId, index, name, rating);
}

export async function fetchAndSaveProblemsAction(contestId: number) {
	const { problemsList } = await fetchAndSaveProblemsByContestId(contestId);
	console.log(problemsList);
	revalidatePath("/shared-contests");
}

export async function scrapAndSaveProblemsAction(contestId: number) {
	console.log("Scaping: shared contest, contestID:" + contestId);
	const res = await scrapAndSaveProblemsByContestId(contestId);
	// const res = await deleteSharedContest(contestId);
	// console.log(res);
	// revalidatePath("/shared-contests");
}