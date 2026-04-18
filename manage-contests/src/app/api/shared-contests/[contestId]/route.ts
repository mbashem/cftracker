import { deleteSharedContest, getSharedContest } from "@/features/shared-contests/services/SharedContestsDBService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, context: { params: Promise<{ contestId: string; }> }) {
	const contestId = parseInt((await context.params).contestId);
	const res = await getSharedContest(contestId);
	return NextResponse.json(res);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ contestId: string; }> }) {
	const contestId = parseInt((await context.params).contestId);
	console.log("Deleting shared contest with contestId: " + contestId);

	const res = await deleteSharedContest(contestId);

	return NextResponse.json(res);
}