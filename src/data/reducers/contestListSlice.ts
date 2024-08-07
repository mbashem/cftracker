import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Contest from "../../types/CF/Contest";

export interface ContestListState {
  contests: Contest[];
  error: string;
  loading: boolean;
}

const contestListInitialState: ContestListState = {
  contests: [],
  error: "",
  loading: true,
};

const contestListSlice = createSlice({
  name: 'contestList',
  initialState: contestListInitialState,
  reducers: {
    addContestList(state, action: PayloadAction<Contest[]>) {
      state.contests = action.payload;
      state.error = "";
      state.loading = false;
    },
    errorFetchingContestList(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    loadingContestList(state) {
      state.loading = true;
    },
  },
});

export const { addContestList, errorFetchingContestList, loadingContestList } = contestListSlice.actions

export default contestListSlice.reducer