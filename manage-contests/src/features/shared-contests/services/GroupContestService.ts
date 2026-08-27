import { Contest } from "@/prisma/generated/client/client";
import { isError, ok, Result } from "@/utils/result";
import { createOrUpdateSharedContest } from "./SharedContestsDBService";

const check = (child_name: string, parent_name: string): boolean => {
	// if (name1.includes(name2)) return true;
	// else {
	let p_name = `${parent_name}`;
	let c_name = `${child_name}`;

	p_name = p_name.replace(/\s/g, "");
	c_name = c_name.replace(/\s/g, "");

	const div1 = "Div.1";
	const div2 = "Div.2";

	if (c_name.includes(div2)) {
		c_name = c_name.replace(div2, div1);
	}

	return (c_name === p_name);
};

/**
 * 
 * Will consider div. 1 as parent contest and div. 2 as child contest.
 * Doesn't cover all cases
 */
const groupContestAsShared = async (contests: Contest[]): Promise<Result<void>> => {
	console.log("HHHH");
	console.log(contests);

	for (let i = 0; i < contests.length; i++) {
		const curr: Contest[] = [];

		for (let j = 0; j < contests.length; j++) {
			if (
				i !== j && check(contests[j].name, contests[i].name)
			) {
				curr.push(contests[j]);
			}
		}

		//console.log(curr);

		if (curr.length !== 0) {
			const parentResult = await createOrUpdateSharedContest(contests[i].contestId, contests[i].contestId);
			if (isError(parentResult)) return parentResult;

			for (const cont of curr) {
				const childResult = await createOrUpdateSharedContest(cont.contestId, contests[i].contestId);
				if (isError(childResult)) return childResult;
			}
		}
	}

	return ok(undefined);
};

export default groupContestAsShared;
