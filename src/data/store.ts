import { combineReducers, configureStore } from '@reduxjs/toolkit';
import logger from "redux-logger";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import userSubmissions from './reducers/userSubmissionsSlice';
import appSlice from './reducers/appSlice';
import userSlice from './reducers/userSlice';
import { userApi } from './queries/userQuery';
import { StorageService } from '../util/StorageService';
import { listApi } from './queries/listQuery';
import { codeforcesApi } from './queries/codeforcesQuery';
import { userSubmissionsListener } from './listeners/userSubmissionsListener';

const rootReducer = combineReducers({
  appState: appSlice,
  userList: userSlice,
  userSubmissions,
  [userApi.reducerPath]: userApi.reducer,
  [listApi.reducerPath]: listApi.reducer,
  [codeforcesApi.reducerPath]: codeforcesApi.reducer
});

const saveToLocalStorage = (state: RootState) => {
  try {
    const newState = {
      userList: state.userList,
      appState: state.appState,
    };
    StorageService.saveObject(StorageService.Keys.StateV2, newState);
  } catch (e) {
    console.log(e);
  }
};

const loadFromLocalStorage = (): any => {
  try {
    const persedData = StorageService.getObject(StorageService.Keys.StateV2, {});

    console.log(persedData);
    return persedData;
  } catch (e) {
    console.log(e);
    return {};
  }
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .prepend(userSubmissionsListener.middleware)
    .concat(logger)
    .concat([userApi.middleware, listApi.middleware, codeforcesApi.middleware]),
  preloadedState: loadFromLocalStorage()
});

store.subscribe(() => saveToLocalStorage(store.getState()));

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;

export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

export default store;
