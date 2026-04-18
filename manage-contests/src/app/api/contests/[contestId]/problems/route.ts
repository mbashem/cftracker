import { getProblemsByContestId } from "@/features/problems/services/ProblemDBService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, context: { params: Promise<{ contestId: string; }>; }) {
	try {
		const contestId = parseInt((await context.params).contestId);
		const problems = await getProblemsByContestId(contestId);

		return NextResponse.json({
			problems: problems,
		});
	} catch (e) {
		console.log(e);
		return NextResponse.error();
	}
}