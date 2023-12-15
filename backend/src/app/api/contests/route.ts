import { getAllContests, getContestByIdFromCF } from "@/app/cf-api/CFApiService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const res = await getAllContests();
	console.log(res);

	return NextResponse.json(res);
}