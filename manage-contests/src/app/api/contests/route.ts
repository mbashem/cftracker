import { getAllContests } from "@/features/contests/services/ContestDBService";
import { NextResponse } from "next/server";

export async function GET() {
	const res = await getAllContests();
	console.log("Hello from contests route");

	return NextResponse.json(res);
}