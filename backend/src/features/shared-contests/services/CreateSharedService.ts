import { SharedContest } from "@prisma/client";
import { ProblemShared, ProblemType } from "../types/ProblemShared";
import { getAllProblems } from "@/features/problems/services/ProblemDBService";
import { getAllSharedContestGroupByParent } from "./SharedContestsService";

export function createShared(problems: ProblemType[], sharedContests: SharedContest[][]): ProblemShared[] {
	let res: ProblemShared[] = [];

	let mp: Map<number, Set<number>> = new Map<number, Set<number>>();

	for (let contests of sharedContests) {
		let list: number[] = contests.map((contest) => contest.contestId);

		for (let num1 of list) {
			for (let num2 of list) {
				if (num1 == num2) continue;

				let curr = mp.get(num1);
				if (curr) curr.add(num2);
				else {
					curr = new Set<number>();
					curr.add(num2);
				}
				mp.set(num1, curr);
			}
		}
	}

	for (let i = 0; i < problems.length; i++) {
		let problem: ProblemShared = new ProblemShared(
			problems[i].contestId,
			problems[i].index,
			problems[i].name
		);

		for (let j = 0; j < problems.length; j++) {
			if (i !== j && problems[i].name === problems[j].name && mp.get(problems[i].contestId)?.has(problems[j].contestId)) {
				problem.shared.push(problems[j]);
			}
		}

		if (problem.shared.length) res.push(problem);
	}

	return res;
};

export async function getGroupedSharedProblems() {
	const send = [];

	const problems = await getAllProblems();
	const sharedContests = await getAllSharedContestGroupByParent();
	const shared = createShared(problems, sharedContests);
	for (let problem of shared) {
		send.push(problem.toJSON());
	}

	return send;
}