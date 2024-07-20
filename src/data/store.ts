import { combineReducers } from "redux";
import { configureStore } from '@reduxjs/toolkit'
import logger from "redux-logger";
import { thunk } from "redux-thunk";
import {
  problemListReducer,
  contestReducer,
  sharedProblemsReducer,
  ContestListStateInterface,
  ProblemListStateInterface,
} from "./reducers/fetchReducers";
import {
  userSubmissionsReducer,
  userReducer,
  SubmissionStateType,
} from "./reducers/userReducers";
import { AppReducer, AppStateType } from "./reducers/appReducers";
import { TypedUseSelectorHook, useSelector } from "react-redux";

const combinedReducers = combineReducers({
  userSubmissions: userSubmissionsReducer,
  problemList: problemListReducer,
  contestList: contestReducer,
  userList: userReducer,
  sharedProblems: sharedProblemsReducer,
  appState: AppReducer,
});

export interface RootStateType {
  userSubmissions: SubmissionStateType;
  problemList: ProblemListStateInterface;
  contestList: ContestListStateInterface;
  userList: any;
  sharedProblems: any;
  appState: AppStateType;
}

const saveToLocalStorage = (state: RootStateType) => {
  try {
    const newState = {
      userList: state.userList,
      appState: state.appState,
    };
    const serializedState: string = JSON.stringify(newState);
    localStorage.setItem("statev2", serializedState);
  } catch (e) {
    console.log(e);
  }
};

const loadFromLocalStorage = (): any => {
  try {
    const serialLizedState = localStorage.getItem("statev2");
    console.log(serialLizedState);
    if (serialLizedState == null) return {};
    const persedData = JSON.parse(serialLizedState);

    let appState = new AppStateType();
    if (persedData.appState) {
      appState.init(persedData.appState);
    }
    persedData.appState = appState;
    console.log(persedData);
    return persedData;
  } catch (e) {
    console.log(e);
    return {};
  }
};

const store = configureStore({
  reducer: combinedReducers,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(thunk, logger),
  preloadedState: loadFromLocalStorage()
})

store.subscribe(() => saveToLocalStorage(store.getState()));

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export default store;
