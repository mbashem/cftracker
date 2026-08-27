import { getGroupedSharedProblems } from "@/features/shared-contests/services/CreateSharedService";
import { isError } from "@/utils/result";
import { NextResponse } from "next/server";

export async function GET() {
	const result = await getGroupedSharedProblems();
	if (isError(result)) {
		return NextResponse.json({
			status: "ERROR",
			error: result.error
		}, { status: 500 });
	}

	return NextResponse.json({
		status: "OK",
		result: result.value
	});
}
