import { createSharedContest, getAllSharedContests } from "@/app/shared-contests/sharedContestsService";
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

	await createSharedContest(contestId, parentId);

	return NextResponse.json(res);
}