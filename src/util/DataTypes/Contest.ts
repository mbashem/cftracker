import { sortByContestId } from "../sortMethods";
import Problem from "./Problem";

export enum ContestCat {
	DIV1 = "Div. 1",
	DIV2 = "Div. 2",
	DIV3 = "Div. 3",
	EDUCATIONAL = "Educational",
	DIV12 = "Div. 1 + Div. 2",
	GLOBAL = "Global",
	OTHERS = "Others",
	ALL = "All",
}

const get_short_and_category = (name: string): [string, ContestCat] => {
	let div2 = -1;
	let div1 = -1;
	let div3 = -1;
	let edu = -1;
	let firstS = -1,
		firstE = -1,
		hashS = -1,
		hashE = -1,
		global = -1;

	name = name.replace("Div.2", ContestCat.DIV2);
	name = name.replace("Div.1", ContestCat.DIV1);

	let short: string = null;
	let category: ContestCat = null;

	for (let i = 0; i < name.length; i++) {
		if (i + ContestCat.DIV1.length - 1 < name.length) {
			if (name.substr(i, ContestCat.DIV1.length) === ContestCat.DIV1) {
				div1 = i;
			} else if (
				name.substr(i, ContestCat.DIV1.length) === ContestCat.DIV2
			) {
				div2 = i;
			} else if (
				name.substr(i, ContestCat.DIV1.length) === ContestCat.DIV3
			) {
				div3 = i;
			}
		}

		if (i + ContestCat.EDUCATIONAL.length - 1 < name.length) {
			if (
				name.substr(i, ContestCat.EDUCATIONAL.length) ===
				ContestCat.EDUCATIONAL
			)
				edu = i;
		}

		if (i + ContestCat.GLOBAL.length - 1 < name.length) {
			if (name.substr(i, ContestCat.GLOBAL.length) === ContestCat.GLOBAL)
				global = i;
		}

		if (hashS === -1 && name[i] === "#") {
			hashS = i;
			hashE = i;
		}

		if (
			hashE === i - 1 &&
			((name[i] >= "0" && name[i] <= "9") ||
				(name[i] >= "A" && name[i] <= "Z") ||
				(name[i] >= "a" && name[i] <= "z"))
		)
			hashE = i;

		if (name[i] >= "0" && name[i] <= "9") {
			if (firstS === -1) {
				firstS = i;
				firstE = i;
			}

			if (firstE === i - 1) firstE = i;
		}
	}

	if (hashS !== -1) {
		if (div2 !== -1 && div1 !== -1) {
			category = ContestCat.DIV12;
		}
		else if (div1 !== -1) {
			category = ContestCat.DIV1;
		} else if (div2 !== -1) {
			category = ContestCat.DIV2;
		} else if (div3 !== -1) {
			category = ContestCat.DIV3;
		}

		if (category)
			short = "CF" + name.substr(hashS, hashE - hashS + 1);
	}

	if (firstS !== -1 && !category) {
		if (edu !== -1) {
			category = ContestCat.EDUCATIONAL;
		}

		if (global !== -1) {
			category = ContestCat.GLOBAL;
		}
		short =
			(edu === -1 ? category : "Edu") +
			"#" +
			name.substr(firstS, firstE - firstS + 1);
	}

	if (!category) {
		short = name;
		if ((div2 !== -1 && div1 !== -1) || name.includes("Good Bye") || name.includes("Hello")) {
			category = ContestCat.DIV12;
		} else {
			category = ContestCat.OTHERS;
		}
	}

	return [short, category];
}

export default class Contest {
	id: number;
	name: string;
	type?: string;
	phase: string;
	frozen: boolean;
	durationSeconds?: number;
	startTimeSeconds?: number;
	relativeTimeSeconds?: number;
	preparedBy?: string;
	websiteUrl?: string;
	description?: string;
	difficulty?: number;
	kind?: string;
	icpcRegion?: string;
	country?: string;
	city?: string;
	season?: string;
	solveCount: number = 0;
	attempCount: number = 0;
	count: number;
	category?: ContestCat;
	short?: string;

	problemList: Record<string, Problem[]>;
	mxInd: number = 0;

	constructor(
		id: number,
		name: string,
		type: string,
		phase: string,
		durationSeconds: number,
		startTimeSeconds: number
	) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.phase = phase;
		this.durationSeconds = durationSeconds;
		this.startTimeSeconds = startTimeSeconds;
		this.solveCount = 0;
		this.attempCount = 0;
		this.count = 0;
		this.problemList = {};

		let get_cat_short = get_short_and_category(this.name);

		this.short = get_cat_short[0];
		this.category = get_cat_short[1];
	}

	public clone = (): Contest => {
		const clonedContest = new Contest(
			this.id,
			this.name,
			this.type,
			this.phase,
			this.durationSeconds,
			this.startTimeSeconds
		);

		clonedContest.solveCount = this.solveCount;
		clonedContest.attempCount = this.attempCount;
		clonedContest.count = this.count;

		clonedContest.problemList = { ...this.problemList };

		return clonedContest;
	};

	addProblem = (problem: Problem): boolean => {
		let ind: string = problem.index.charAt(0);
		let indnum: number = problem.index.charCodeAt(0) - ('A').charCodeAt(0) + 1;
		if (indnum > this.mxInd) this.mxInd = indnum;
		if (this.problemList[ind] === undefined)
			this.problemList[ind] = new Array<Problem>();
		if (this.problemList[ind].length > 2) return false;

		for (let i = 0; i < this.problemList[ind].length; i++) {
			if (problem.getId() === this.problemList[ind][i].getId()) {
				this.problemList[ind][i] = problem;
				return false;
			}
		}

		this.count++;
		this.problemList[ind].push(problem);
		this.problemList[ind].sort(sortByContestId);
		return true;
	};
}
