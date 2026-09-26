import { combineReducers, configureStore } from '@reduxjs/toolkit';
import logger from "redux-logger";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import userSubmissions from './reducers/userSubmissionsSlice';
import appSlice, { type AppState, initialAppState } from './reducers/appSlice';
import userSlice from './reducers/userSlice';
import { userApi } from './queries/userQuery';
import { StorageService } from '../util/StorageService';
import { listApi } from './queries/listQuery';
import { codeforcesApi } from './queries/codeforcesQuery';
import { userSubmissionsListener } from './listeners/userSubmissionsListener';
import { IS_DEBUG_MODE } from '../util/env';
import { validateValue, type ValidatorRecord, validators } from '../util/validators';
import { ThemesType } from '../util/Theme';

const IS_REDUX_LOGGING_ENABLED = IS_DEBUG_MODE || sessionStorage.getItem("redux-debug") === "true";

const rootReducer = combineReducers({
  appState: appSlice,
  userList: userSlice,
  userSubmissions,
  [userApi.reducerPath]: userApi.reducer,
  [listApi.reducerPath]: listApi.reducer,
  [codeforcesApi.reducerPath]: codeforcesApi.reducer
});

const appStateValidators = {
  minRating: validators.nonNegativeInteger,
  maxRating: validators.nonNegativeInteger,
  minContestId: validators.positiveInteger,
  maxContestId: validators.positiveInteger,
  errorLog: validators.stringArray,
  successLog: validators.stringArray,
  themeMod: validators.enumValue([ThemesType.DARK, ThemesType.LIGHT]),
  loaded: validators.boolean,
} satisfies ValidatorRecord<AppState>;

function saveToLocalStorage(state: RootState) {
  try {
    const newState = {
      userList: state.userList,
      appState: state.appState,
    };
    StorageService.saveObject(StorageService.Keys.StateV2, newState);
  } catch (e) {
    console.log(e);
  }
}

function loadFromLocalStorage(): any {
  try {
    const persedData = StorageService.getObject<Record<string, unknown>>(StorageService.Keys.StateV2, {});

    console.log(persedData);
    return {
      ...persedData,
      appState: validateValue(persedData.appState, initialAppState, appStateValidators),
    };
  } catch (e) {
    console.log(e);
    return {};
  }
}

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware().prepend(userSubmissionsListener.middleware);
    if (IS_REDUX_LOGGING_ENABLED) middleware.push(logger);
    return middleware.concat([userApi.middleware, listApi.middleware, codeforcesApi.middleware]);
  },
  preloadedState: loadFromLocalStorage()
});

store.subscribe(() => saveToLocalStorage(store.getState()));

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;

export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

export default store;
