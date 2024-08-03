import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Theme, { ThemesType } from '../../util/Theme';

// Define the state interface
export interface AppState {
  readonly minRating: number;
  readonly maxRating: number;
  readonly minContestId: number;
  readonly maxContestId: number;
  errorLog: string[];
  successLog: string[];
  theme: Theme;
  themeMod: ThemesType;
  loaded: boolean;
}

// Initial state
const initAppState: AppState = {
  minRating: 0,
  maxRating: 4000,
  minContestId: 1,
  maxContestId: 4000,
  errorLog: [],
  successLog: [],
  theme: new Theme(ThemesType.DARK),
  themeMod: ThemesType.DARK,
  loaded: false,
};

// Create a slice for app state
const appSlice = createSlice({
  name: 'app',
  initialState: initAppState,
  reducers: {
    clearErrorLog(state) {
      state.errorLog = [];
    },
    changeTheme(state, action: PayloadAction<ThemesType>) {
      state.themeMod = action.payload;
      state.theme = new Theme(state.themeMod);
    },
    appLoaded(state) {
      state.loaded = true;
    },
  },
});

// Export actions and reducer
export const { clearErrorLog, changeTheme, appLoaded } = appSlice.actions;

export default appSlice.reducer;
