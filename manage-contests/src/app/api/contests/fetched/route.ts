import { getFetchedProblemsContestIdList } from "@/features/problems/services/ProblemDBService";
import { NextResponse } from "next/server";

export async function GET() {
	const res = await getFetchedProblemsContestIdList();
	// console.log(res);

	return NextResponse.json(res);
}