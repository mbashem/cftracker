import { getAllContests, getContestByIdFromCF } from "@/features/cf-api/CFApiService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const res = await getAllContests();
	console.log(res);

	return NextResponse.json(res);
}