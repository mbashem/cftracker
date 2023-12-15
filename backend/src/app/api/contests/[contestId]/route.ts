import { getContestByIdFromCF } from "@/app/cf-api/CFApiService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: { contestId: number } }) {
	const res = await getContestByIdFromCF(context.params.contestId);
	console.log(res);

	return NextResponse.json(res);
}