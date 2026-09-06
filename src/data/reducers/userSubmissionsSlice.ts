import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import { compareSubmissionData, SubmissionData } from '../../types/CF/Submission';
import { removeAllHandle, removeHandle } from './userSlice';

export interface HandleSubmissionState {
  error: string | undefined;
  loading: boolean;
  requestId: string;
  submissions: SubmissionData[];
}

export interface SubmissionState {
  error: string | undefined;
  loading: number;
  requestId: string | undefined;
  submissionsByHandle: Record<string, HandleSubmissionState>;
}

const submissionsInitialState: SubmissionState = {
  error: undefined,
  loading: 0,
  requestId: undefined,
  submissionsByHandle: {},
};

function getSubmissionError(submissionsByHandle: Record<string, HandleSubmissionState>) {
  return Object.values(submissionsByHandle).find((state) => state.error !== undefined)?.error;
}

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
        const handles = action.payload.handles;
        state.error = undefined;
        state.loading = handles.length;
        state.requestId = action.payload.requestId;
        state.submissionsByHandle = Object.fromEntries(handles.map((handle) => [handle, {
          error: undefined,
          loading: true,
          requestId: action.payload.requestId,
          submissions: [],
        }]));
      },
    },
    addUserSubmissions(
      state,
      action: PayloadAction<{ handle: string; requestId: string; submissions: SubmissionData[]; }>
    ) {
      if (action.payload.requestId !== state.requestId) return;
      const handleState = state.submissionsByHandle[action.payload.handle];
      if (handleState === undefined || handleState.requestId !== action.payload.requestId || !handleState.loading) return;

      state.loading = Math.max(0, state.loading - 1);
      handleState.loading = false;
      handleState.submissions = [...action.payload.submissions].sort(compareSubmissionData);
    },
    errorFetchingUserSubmissions(
      state,
      action: PayloadAction<{ error: string; handle: string; requestId: string; }>
    ) {
      if (action.payload.requestId !== state.requestId) return;
      const handleState = state.submissionsByHandle[action.payload.handle];
      if (handleState === undefined || handleState.requestId !== action.payload.requestId || !handleState.loading) return;

      state.error = action.payload.error;
      state.loading = Math.max(0, state.loading - 1);
      handleState.error = action.payload.error;
      handleState.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(removeAllHandle, () => ({
      ...submissionsInitialState,
      submissionsByHandle: {},
    }));
    builder.addCase(removeHandle, (state, action) => {
      const handle = action.payload.handle;
      const handleState = state.submissionsByHandle[handle];
      if (handleState === undefined) return;

      if (handleState.loading) state.loading = Math.max(0, state.loading - 1);
      delete state.submissionsByHandle[handle];
      state.error = getSubmissionError(state.submissionsByHandle);
    });
  },
});

export const {
  addUserSubmissions,
  errorFetchingUserSubmissions,
  requestUserSubmissions,
} = userSubmissionsSlice.actions;

export default userSubmissionsSlice.reducer;
