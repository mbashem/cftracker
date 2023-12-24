
import { createOrUpdateSharedContest, getAllSharedContests } from "@/features/shared-contests/services/SharedContestsService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const res = getAllSharedContests();

	return NextResponse.json(res);
}

export async function POST(req: NextRequest) {
	const res = {
		"status": "OK",
	};
	const data = await req.json();
	let contestId = data["contestId"] as number;
	let parentId = data["parentId"] as number;

	await createOrUpdateSharedContest(contestId, parentId);

	return NextResponse.json(res);
}