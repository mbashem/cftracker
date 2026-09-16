import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemesType } from '../../util/Theme';

export interface AppState {
  readonly minRating: number;
  readonly maxRating: number;
  errorLog: string[];
  successLog: string[];
  themeMod: ThemesType;
  loaded: boolean;
}

const initAppState: AppState = {
  minRating: 0,
  maxRating: 4000,
  errorLog: [],
  successLog: [],
  themeMod: ThemesType.DARK,
  loaded: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState: initAppState,
  reducers: {
    clearErrorLog(state) {
      state.errorLog = [];
    },
    changeTheme(state, action: PayloadAction<ThemesType>) {
      state.themeMod = action.payload;
    },
    appLoaded(state) {
      state.loaded = true;
    },
  },
});

// Export actions and reducer
export const { clearErrorLog, changeTheme, appLoaded } = appSlice.actions;

export default appSlice.reducer;
