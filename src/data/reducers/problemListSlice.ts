import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Problem from "../../types/CF/Problem";
import { sortByContestId } from "../../util/sortMethods";

export interface ProblemListState {
	problems: Problem[];
	error: string;
	tags: string[];
	loading: boolean;
}

const initialState: ProblemListState = {
	problems: [],
	error: "",
	tags: [],
	loading: true,
};

const problemListSlice = createSlice({
	name: "problemList",
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

export const { addProblems, errorFetchingProblems, loadingProblems } = problemListSlice.actions

export default problemListSlice.reducer