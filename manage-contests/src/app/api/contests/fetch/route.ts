import { fetchAndSaveAllContests } from "@/features/contests/services/ContestDBService";
import { NextResponse } from "next/server";

export async function GET() {
	const res = await fetchAndSaveAllContests();
	console.log(res);

	return NextResponse.json(res);
}