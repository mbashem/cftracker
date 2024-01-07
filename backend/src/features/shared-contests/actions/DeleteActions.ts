"use server";

import { revalidatePath } from "next/cache";
import { deleteSharedContest } from "../services/SharedContestsService";

export async function deleteSharedContestAction(contestId: number) {
	console.log("Deleting: shared contest, contestID:" + contestId);
	const res = await deleteSharedContest(contestId);
	console.log(res);
	revalidatePath("/shared-contests");
}