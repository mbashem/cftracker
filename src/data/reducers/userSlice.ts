import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import User from '../../types/User';

export interface UserState {
  handles: string[];
  error: string;
  id: number;
  user?: User;
}

const userInitialState: UserState = {
  handles: [],
  error: '',
  id: 0,
};

const userSlice = createSlice({
  name: 'user',
  initialState: userInitialState,
  reducers: {
    addHandle(state, action: PayloadAction<{ id: number; handle: string; }>) {
      if (action.payload.id < state.id) {
        return;
      }
      if (action.payload.id > state.id) {
        state.handles = [];
      }
      state.handles.push(action.payload.handle);
      state.id = action.payload.id;
    },
    removeHandle(state, action: PayloadAction<{ handle: string; }>) {
      state.handles = state.handles.filter((handle) => handle !== action.payload.handle);
    },
    removeAllHandle(state) {
      state.handles = [];
      state.error = '';
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.error = "";
    },
    removeUser(state) {
      state.user = undefined;
    },
    errorAuthenticatingUser(state, action: PayloadAction<{ errorMessage: string; }>) {
      state.error = action.payload.errorMessage;
    },
  },
});

export const { addHandle, removeHandle, removeAllHandle, setUser, removeUser, errorAuthenticatingUser } = userSlice.actions;

export default userSlice.reducer;

