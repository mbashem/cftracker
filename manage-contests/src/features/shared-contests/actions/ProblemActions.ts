"use server"

import { createOrUpdateProblem } from "@/features/problems/services/ProblemDBService";
import { fetchAndSaveProblemsByContestId, scrapAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { isError } from "@/utils/result";
import { revalidatePath } from "next/dist/server/web/spec-extension/revalidate";

export async function addProblemAction(contestId: number, index: string, name: string, rating: number | undefined = undefined) {
	console.log("Adding problem: ", { contestId, index, name });

	const result = await createOrUpdateProblem(contestId, index, name, rating);
	if (isError(result)) {
		console.error("Unable to add problem", result.error);
		return;
	}

	console.log("Added problem: ", result.value);
}

export async function fetchAndSaveProblemsAction(contestId: number) {
	const result = await fetchAndSaveProblemsByContestId(contestId);
	if (isError(result)) {
		console.error("Unable to fetch and save contest problems", result.error);
		return;
	}

	console.log(result.value.problemsList);
	revalidatePath("/shared-contests");
}

export async function scrapAndSaveProblemsAction(contestId: number) {
	console.log("Scaping: shared contest, contestID:" + contestId);
	const result = await scrapAndSaveProblemsByContestId(contestId);
	if (isError(result)) {
		console.error("Unable to scrape and save contest problems", result.error);
	}
}
