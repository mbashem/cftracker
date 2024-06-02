import { getContestByIdFromCF } from "@/features/cf-api/CFApiService";
import { createOrUpdateContest } from "@/features/contests/services/ContestDBService";
import { createOrUpdateProblem } from "@/features/problems/services/ProblemDBService";
import { Problem } from "@/features/problems/types/problemsTypes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: { contestId: number } }) {
	const res = await getContestByIdFromCF(context.params.contestId);

	try {
		const insertedContest = await createOrUpdateContest(res.contest.id, res.contest.name);

		const problemsList: Problem[] = [];

		for (const problem of res.problems) {
			const insertedProblem = await createOrUpdateProblem(problem.contestId, problem.index, problem.name);
			problemsList.push(insertedProblem);
		}
		return NextResponse.json({
			contest: insertedContest,
			problems: problemsList,
		});
	} catch (e) {
		console.log(e);
		return NextResponse.error();
	}
}