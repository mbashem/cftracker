import { fetchAndSaveAllContests } from "@/features/contests/services/ContestDBService";
import { isError } from "@/utils/result";
import { NextResponse } from "next/server";

export async function GET() {
	const result = await fetchAndSaveAllContests();
	if (isError(result)) {
		return NextResponse.json({ error: result.error }, { status: 502 });
	}

	return NextResponse.json(result.value);
}
