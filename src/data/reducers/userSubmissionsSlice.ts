import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Submission from '../../util/DataTypes/Submission';
import { sortByCompare } from '../../util/sortMethods';

export interface SubmissionState {
  error: string;
  loading: number;
  id: number;
  submissions: Submission[];
}

// Initial state
const submissionsInitialState: SubmissionState = {
  error: '',
  loading: 0,
  id: 0,
  submissions: [],
};

// Create a slice for user submissions
const userSubmissionsSlice = createSlice({
  name: 'userSubmissions',
  initialState: submissionsInitialState,
  reducers: {
    clearUsersSubmissions(state) {
      state.error = '';
      state.loading = 0;
      state.id = 0;
      state.submissions = [];
    },
    addUserSubmissions(state, action: PayloadAction<{ id: number, result: Submission[] }>) {
      const { id, result } = action.payload;
      let newLoading = state.loading - 1;

      if (id === state.id) {
        state = { ...state };
      } else if (id > state.id) {
        state = { ...submissionsInitialState, id };
      } else {
        state.loading = newLoading;
        return state;
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
    loadingUserSubmissions(state) {
      state.error = '';
      state.loading += 1;
    },
  },
});

// Export actions and reducer
export const {
  clearUsersSubmissions,
  addUserSubmissions,
  errorFetchingUserSubmissions,
  loadingUserSubmissions,
} = userSubmissionsSlice.actions;

export default userSubmissionsSlice.reducer;
