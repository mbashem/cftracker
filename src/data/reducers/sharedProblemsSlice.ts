import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProblemShared } from "../../types/Problem";
import { sortByContestId } from "../../util/sortMethods";

export interface SharedProblem {
	problems: ProblemShared[];
	error: string;
	loading: boolean;
}

const sharedProblemsInitialState: SharedProblem = {
	problems: [],
	error: "",
	loading: true,
};

const sharedProblemsSlice = createSlice({
	name: 'sharedProblems',
	initialState: sharedProblemsInitialState,
	reducers: {
		addSharedProblems(state, action: PayloadAction<ProblemShared[]>) {
			state.problems = action.payload.sort(sortByContestId);
			state.error = "";
			state.loading = false;
		},
		errorFetchingSharedProblems(state, action: PayloadAction<string>) {
			state.error = action.payload;
			state.loading = false;
		},
		loadingSharedProblems(state) {
			state.loading = true;
		},
	},
});

export const { addSharedProblems, errorFetchingSharedProblems, loadingSharedProblems } = sharedProblemsSlice.actions

export default sharedProblemsSlice.reducer