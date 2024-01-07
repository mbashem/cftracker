import { getGroupedSharedProblems } from "@/features/shared-contests/services/CreateSharedService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const res = await getGroupedSharedProblems();
	console.log(res);
	return NextResponse.json({
		status: "OK",
		result: res
	});
}