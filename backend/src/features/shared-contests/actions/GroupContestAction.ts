"use server";
import { getAllContests } from "@/features/contests/services/ContestService";
import groupContestAsShared from "@/features/shared-contests/services/GroupContestService"

export const groupContests = async () => {
	console.log("Server: Grouping contests");

	const contestList = await getAllContests();
	await groupContestAsShared(contestList);
};