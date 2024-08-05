import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  handles: string[];
  error: string;
  loading: boolean;
  id: number;
}

const userInitialState: UserState = {
  handles: [],
  error: '',
  loading: false,
  id: 0,
};

const userSlice = createSlice({
  name: 'user',
  initialState: userInitialState,
  reducers: {
    loadingUsers(state) {
      state.loading = true;
    },
    addUser(state, action: PayloadAction<{ id: number; handle: string }>) {
      if (action.payload.id < state.id) {
        return;
      }
      if (action.payload.id > state.id) {
        state.handles = [];
      }
      state.handles.push(action.payload.handle);
      state.id = action.payload.id;
    },
    removeUser(state, action: PayloadAction<{ handle: string }>) {
      state.handles = state.handles.filter((handle) => handle !== action.payload.handle);
    },
    errorFetchingUser(state) {
      state.handles = [];
      state.error = '';
      state.loading = false;
    },
    removeAllUser(state) {
      state.handles = [];
      state.error = '';
      state.loading = false;
    },
  },
});

export const { loadingUsers, addUser, removeUser, errorFetchingUser, removeAllUser } = userSlice.actions;

export default userSlice.reducer;
