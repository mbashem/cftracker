import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import User from '../../types/User';

export interface UserState {
  handles: string[];
  error: string;
  id: number;
  user?: User;
  authenticationVersion: number;
  authenticationStatus: 'checking' | 'authenticated' | 'unauthenticated';
  authenticationInitialized: boolean;
  sessionToken?: string;
}

export const userInitialState: UserState = {
  handles: [],
  error: '',
  authenticationVersion: 0,
  authenticationStatus: 'unauthenticated',
  authenticationInitialized: false,
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
      state.sessionToken = action.payload.jwtToken;
      state.authenticationStatus = 'authenticated';
      state.authenticationInitialized = true;
      state.error = "";
    },
    checkAuthentication(state, action: PayloadAction<string | undefined>) {
      state.authenticationVersion = (state.authenticationVersion ?? 0) + 1;
      state.authenticationInitialized = true;
      state.authenticationStatus = action.payload ? 'checking' : 'unauthenticated';
      state.sessionToken = action.payload;
      state.user = undefined;
      state.error = '';
    },
    beginAuthentication(state) {
      state.authenticationVersion = (state.authenticationVersion ?? 0) + 1;
      state.authenticationStatus = 'checking';
      state.authenticationInitialized = true;
    },
    removeUser(state) {
      state.authenticationVersion = (state.authenticationVersion ?? 0) + 1;
      state.user = undefined;
      state.sessionToken = undefined;
      state.authenticationStatus = 'unauthenticated';
      state.authenticationInitialized = true;
    },
    errorAuthenticatingUser(state, action: PayloadAction<{ errorMessage: string; }>) {
      state.error = action.payload.errorMessage;
    },
  },
});

export const { beginAuthentication, checkAuthentication, addHandle, removeHandle, removeAllHandle, setUser, removeUser, errorAuthenticatingUser } = userSlice.actions;

export default userSlice.reducer;
