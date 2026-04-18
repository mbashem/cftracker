import { getContest } from "@/features/contests/services/ContestDBService";
import { getProblemsByContestId } from "@/features/problems/services/ProblemDBService";
import { Problem } from "@/features/problems/types/problemsTypes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: Promise<{ contestId: string }> }) {
	try {
		const contestId = parseInt((await context.params).contestId);
		const contest = await getContest(contestId	);
		const contestProblems: Problem[] = await getProblemsByContestId(contestId);
		return NextResponse.json({
			contest: contest,
			problems: contestProblems,
		});
	} catch (e) {
		console.log(e);
		return NextResponse.error();
	}
}