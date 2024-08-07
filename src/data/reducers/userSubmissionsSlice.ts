import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Submission from '../../types/CF/Submission';
import { sortByCompare } from '../../util/sortMethods';

export interface SubmissionState {
  error: string;
  loading: number;
  id: number;
  submissions: Submission[];
}

const submissionsInitialState: SubmissionState = {
  error: '',
  loading: 0,
  id: 0,
  submissions: [],
};

const userSubmissionsSlice = createSlice({
  name: 'userSubmissions',
  initialState: submissionsInitialState,
  reducers: {
    clearAllUsersSubmissions(state) {
      state.error = '';
      state.loading = 0;
      state.id = 0;
      state.submissions = [];
    },
    addUserSubmissions(state, action: PayloadAction<{ id: number, result: Submission[] }>) {
      const { id, result } = action.payload;
      let newLoading = state.loading - 1;

      if (id < state.id) {
        return;
      } else if (id > state.id) {
        state.submissions = []
        state.error = ""
        state.id = id
      }

      state.loading = newLoading;
      state.error = '';

      result.forEach(element => {
        state.submissions.push(new Submission(element));
      });

      state.submissions.sort(sortByCompare);
    },
    errorFetchingUserSubmissions(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading -= 1;
    },
    // TODO: Fix loading count. Currently loading count is not if user refreshes submissions. Adding id will be a easy fix.
    loadingUserSubmissions(state) {
      state.error = '';
      state.loading += 1;
    },
  },
});

// Export actions and reducer
export const {
  clearAllUsersSubmissions,
  addUserSubmissions,
  errorFetchingUserSubmissions,
  loadingUserSubmissions,
} = userSubmissionsSlice.actions;

export default userSubmissionsSlice.reducer;
