import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import { compareSubmissionData, SubmissionData } from '../../types/CF/Submission';

export interface SubmissionState {
  error: string | undefined;
  loading: number;
  requestId: string | undefined;
  submissions: SubmissionData[];
}

const submissionsInitialState: SubmissionState = {
  error: undefined,
  loading: 0,
  requestId: undefined,
  submissions: [],
};

const userSubmissionsSlice = createSlice({
  name: 'userSubmissions',
  initialState: submissionsInitialState,
  reducers: {
    requestUserSubmissions: {
      prepare(handles: string[], wait = false) {
        return {
          payload: {
            handles,
            requestId: nanoid(),
            wait,
          },
        };
      },
      reducer(state, action: PayloadAction<{ handles: string[]; requestId: string; wait: boolean; }>) {
        state.error = undefined;
        state.loading = action.payload.handles.length;
        state.requestId = action.payload.requestId;
        state.submissions = [];
      },
    },
    addUserSubmissions(
      state,
      action: PayloadAction<{ requestId: string; submissions: SubmissionData[]; }>
    ) {
      if (action.payload.requestId !== state.requestId) return;

      state.loading = Math.max(0, state.loading - 1);
      for (const submission of action.payload.submissions)
        state.submissions.push(submission);

      state.submissions.sort(compareSubmissionData);
    },
    errorFetchingUserSubmissions(
      state,
      action: PayloadAction<{ error: string; requestId: string; }>
    ) {
      if (action.payload.requestId !== state.requestId) return;

      state.error = action.payload.error;
      state.loading = Math.max(0, state.loading - 1);
    },
  },
});

export const {
  addUserSubmissions,
  errorFetchingUserSubmissions,
  requestUserSubmissions,
} = userSubmissionsSlice.actions;

export default userSubmissionsSlice.reducer;
