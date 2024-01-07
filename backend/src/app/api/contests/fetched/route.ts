import { getAllContests } from "@/features/contests/services/ContestService";
import { getFetchedProblemsContestIdList } from "@/features/problems/services/ProblemDBService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const res = await getFetchedProblemsContestIdList();
	// console.log(res);

	return NextResponse.json(res);
}