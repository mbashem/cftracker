import { getContestWithProblemByIdFromCF } from "@/features/cf-api/CFApiService";
import { createOrUpdateContest } from "@/features/contests/services/ContestService";
import { createOrUpdateProblem } from "@/features/problems/services/ProblemDBService";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { Problem } from "@/features/problems/types/problemsTypes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: { contestId: number } }) {
	const res = await getContestWithProblemByIdFromCF(context.params.contestId);

	try {
		const { insertedContest, problemsList } = await fetchAndSaveProblemsByContestId(context.params.contestId);
		
		return NextResponse.json({
			contest: insertedContest,
			problems: problemsList,
		});
	} catch (e) {
		console.log(e);
		return NextResponse.error();
	}
}