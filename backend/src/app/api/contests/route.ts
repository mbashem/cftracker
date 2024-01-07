import { getAllContests } from "@/features/contests/services/ContestService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const res = await getAllContests();
	// console.log(res);
	console.log("Hello from contests route");

	return NextResponse.json(res);
}