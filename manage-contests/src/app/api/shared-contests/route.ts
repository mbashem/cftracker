
import { createOrUpdateSharedContest, getAllSharedContestGroupByParent } from "@/features/shared-contests/services/SharedContestsDBService";
import { isError } from "@/utils/result";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	const res = await getAllSharedContestGroupByParent();
	console.log(res);
	return NextResponse.json(res);
}

export async function POST(req: NextRequest) {
	const res = {
		"status": "OK",
	};
	const data = await req.json();
	const contestId = data["contestId"] as number;
	const parentId = data["parentId"] as number;

	const result = await createOrUpdateSharedContest(contestId, parentId);
	if (isError(result)) {
		return NextResponse.json({
			status: "ERROR",
			error: result.error
		}, { status: result.error.code === "DATABASE_ERROR" ? 500 : 400 });
	}

	return NextResponse.json({
		...res,
		result: result.value
	});
}
