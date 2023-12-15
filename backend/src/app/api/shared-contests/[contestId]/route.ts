import { deleteSharedContest, getSharedContest } from "@/app/shared-contests/sharedContestsService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: { contestId: number } }) {
	const contestId = context.params.contestId;
	const res = await getSharedContest(contestId);
	return NextResponse.json(res);
}

export async function DELETE(req: NextRequest, context: { params: { contestId: number } }) {
	const contestId = context.params.contestId;

	const res = await deleteSharedContest(contestId);

	return NextResponse.json(res);
}