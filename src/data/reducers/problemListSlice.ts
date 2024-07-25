import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Problem from "../../util/DataTypes/Problem";
import { sortByContestId } from "../../util/sortMethods";

export interface ProblemListStateInterface {
	problems: Problem[];
	error: string;
	tags: string[];
	loading: boolean;
}

const initialState: ProblemListStateInterface = {
	problems: [],
	error: "",
	tags: [],
	loading: true,
};

const problemListSlice = createSlice({
	name: "problem-list",
	initialState,
	reducers: {
		addProblems(state, action: PayloadAction<{ problems: Problem[] }>) {
			action.payload.problems = action.payload.problems.sort(sortByContestId);
			let tags = new Set<string>();

			for (let problem of action.payload.problems)
				for (let tag of problem.tags) tags.add(tag);

			state.problems = action.payload.problems;
			state.error = "";
			state.tags = Array.from(tags)
			state.loading = false;

			return state;
		},
		errorFetchingProblems(state, action: PayloadAction<{ error: string }>) {
			state.error = action.payload.error;
			state.loading = false;
			return state;
		},
		loadingProblems(state) {
			state.error = "";
			state.loading = true;
			return state;
		}
	}
})

export default problemListSlice