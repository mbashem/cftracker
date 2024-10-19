import { sortByContestId } from "../../util/sortMethods";
import Problem from "./Problem";

export enum ContestCat {
	DIV1 = "Div. 1",
	DIV2 = "Div. 2",
	DIV3 = "Div. 3",
	DIV4 = "Div. 4",
	EDUCATIONAL = "Educational",
	DIV12 = "Div. 1 + Div. 2",
	GLOBAL = "Global",
	OTHERS = "Others"
}

const Other_Category_Contests = [2010];
const Div12_Category_Contests = [1930];

const get_short_and_category = (name: string, contestId: number): [string, ContestCat] => {
	let CODEFORCES: string = "Codeforces";
	name = name.replace("Div.2", ContestCat.DIV2);
	name = name.replace("Div.1", ContestCat.DIV1);
	name = name.replace("Div 2", ContestCat.DIV2);

	let short: string = "";
	let category: ContestCat | null = null;
	// returns -1 if not found
	let div1 = name.indexOf(ContestCat.DIV1);
	let div2 = name.indexOf(ContestCat.DIV2);
	let div3 = name.indexOf(ContestCat.DIV3);
	let div4 = name.indexOf(ContestCat.DIV4);
	let edu = name.indexOf(ContestCat.EDUCATIONAL);
	let global = name.indexOf(ContestCat.GLOBAL);

	let split_name = name.split(" ");
	let lst = "";
	let cf = -1;
	let found_round = false;

	for (let i = 0; i < split_name.length; i++) {
		split_name[i] = split_name[i].replace(/[^0-9a-z]/gi, '');
		let curr = split_name[i];
		if (curr.length === 0) continue;
		if (curr === CODEFORCES) {
			cf = i;
			continue;
		}
		if (found_round) {
			lst = curr;
			break;
		}
		if (cf !== -1 && curr == "Round")
			found_round = true;
		else if (global === -1)
			cf = -1;
	}
	// console.log(split_name, cf, lst, found_round);
	if (edu !== -1) {
		category = ContestCat.EDUCATIONAL;
		short = "Edu " + lst;
	} else if (global !== -1) {
		category = ContestCat.GLOBAL;
		short = "Global " + lst;
	}
	else if (div2 !== -1 && div1 !== -1)
		category = ContestCat.DIV12;
	else if (div1 !== -1)
		category = ContestCat.DIV1;
	else if (div2 !== -1)
		category = ContestCat.DIV2;
	else if (div3 !== -1)
		category = ContestCat.DIV3;
	else if (div4 !== -1)
		category = ContestCat.DIV4;

	if (short.length === 0) {
		if (lst.length > 0 && cf !== -1) {
			if (lst[0] == '#')
				short = "CF";
			else
				short = "CF ";

			short += lst;
		} else {
			short = name;
			short = short.replace(" Round", "");
		}
	}
	if (!category) {
		if ((div2 !== -1 && div1 !== -1) || name.includes("Good Bye") || name.includes("Hello"))
			category = ContestCat.DIV12;
		else
			category = ContestCat.OTHERS;
	}

	// Special cases
	if(Other_Category_Contests.includes(contestId))
		category = ContestCat.OTHERS
	else if(Div12_Category_Contests.includes(contestId))
		category = ContestCat.DIV12

	return [short, category];
};

export default class Contest {
	id: number;
	name: string;
	type?: string;
	phase: string;
	// FIXME: As of 10/8/2024 this wasn't used in the site. So commented this out as this wasn't initialized either.
	// frozen: boolean;
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
		type: string | undefined,
		phase: string,
		durationSeconds: number | undefined,
		startTimeSeconds: number | undefined
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

		let get_cat_short = get_short_and_category(this.name, this.id);

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
			if (problem.id === this.problemList[ind][i].id) {
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
