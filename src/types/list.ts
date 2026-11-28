export interface List {
	id: number;
	userId: number;
	name: string;
	createdAt: string;
}

export const PRACTICE_STATUS_LABELS = {
	not_started: "Not started",
	attempted: "Attempted",
	in_progress: "In progress",
	solved: "Solved",
};

export const PRACTICE_HELP_LABELS = {
	none: "None",
	test_case: "Test case",
	hint: "Hint",
	editorial: "Editorial",
	solution: "Solution",
};

export type PracticeStatus = keyof typeof PRACTICE_STATUS_LABELS;
export type PracticeHelp = keyof typeof PRACTICE_HELP_LABELS;

export interface PracticeFields {
	status?: PracticeStatus | null;
	helpUsed?: PracticeHelp | null;
	solvedOn?: string | null;
	timeSpent?: number | null;
	notes?: string | null;
}

export interface ListItemInput extends PracticeFields {
	problemId: string;
}

export interface ListItem extends ListItemInput {
	listId: number;
	position: number;
	createdAt: string;
	updatedAt?: string;
}

export interface ListWithItem extends List {
	items: ListItem[];
}

export function jsonToList(json: any): List {
	return {
		id: json.id,
		userId: json.user_id,
		name: json.name,
		createdAt: json.created_at,
	};
}

export function jsonToListItem(json: any): ListItem {
	return {
		listId: json.list_id,
		problemId: json.problem_id,
		position: json.position,
		createdAt: json.created_at,
		updatedAt: json.updated_at,
		status: json.status,
		helpUsed: json.help_used,
		solvedOn: json.solved_on,
		timeSpent: json.time_spent,
		notes: json.notes,
	};
}

export function practiceToJson({ status, helpUsed, solvedOn, timeSpent, notes }: PracticeFields) {
	return { status, help_used: helpUsed, solved_on: solvedOn, time_spent: timeSpent, notes };
}

/** Committed addition with duplicate input occurrences reported separately. */
export interface ListAddResult {
 added: ListItem[];
 duplicateProblemIds: string[];
 order: { problemId: string; position: number }[];
 rebalanced: boolean;
}

/** Committed removal outcome; absent IDs are successful no-ops. */
export interface ListMoveResult extends Pick<ListAddResult, "order" | "rebalanced"> {
	absentProblemIds: string[];
}

export interface ListRemoveResult extends ListMoveResult {
	removedProblemIds: string[];
}
