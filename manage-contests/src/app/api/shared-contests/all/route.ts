import { getGroupedSharedProblems } from "@/features/shared-contests/services/CreateSharedService";
import { NextResponse } from "next/server";

export async function GET() {
	const res = await getGroupedSharedProblems();
	console.log(res);
	return NextResponse.json({
		status: "OK",
		result: res
	});
}