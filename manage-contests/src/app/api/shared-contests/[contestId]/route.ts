import { deleteSharedContest, getSharedContest } from "@/features/shared-contests/services/SharedContestsDBService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, context: { params: { contestId: string; }; }) {
	const contestId = context.params.contestId;
	const res = await getSharedContest(parseInt(contestId, 10));
	return NextResponse.json(res);
}

export async function DELETE(_req: NextRequest, context: { params: { contestId: string; }; }) {
	const contestId = context.params.contestId;
	console.log("Deleting shared contest with contestId: " + contestId);

	const res = await deleteSharedContest(parseInt(contestId, 10));

	return NextResponse.json(res);
}