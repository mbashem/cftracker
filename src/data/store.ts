import { applyMiddleware, combineReducers, createStore } from "redux";
import logger from "redux-logger";
import thunk from "redux-thunk";
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
import {
  SOLVED_PROBLEMS,
  ATTEMPTED_PROBLEMS,
  SOLVED_CONTESTS,
  ATTEMPTED_CONTESTS,
} from "../util/constants";
import { AppReducer, AppStateInterfac } from "./reducers/appReducers";
import Contest from "../util/DataTypes/Contest";
import Problem from "../util/DataTypes/Problem";

const submissions = {
  status: "OK",
  result: [
    {
      id: 105129023,
      contestId: 1368,
      creationTimeSeconds: 1611387508,
      relativeTimeSeconds: 2147483647,
      problem: {
        contestId: 1368,
        index: "D",
        name: "AND, OR and square sum",
        type: "PROGRAMMING",
        points: 1750,
        rating: 1700,
        tags: ["bitmasks", "greedy", "math"],
      },
      author: {
        contestId: 1368,
        members: [{ handle: "bashem" }],
        participantType: "PRACTICE",
        ghost: false,
        startTimeSeconds: 1592491500,
      },
      programmingLanguage: "GNU C++14",
      verdict: "OK",
      testset: "TESTS",
      passedTestCount: 17,
      timeConsumedMillis: 109,
      memoryConsumedBytes: 1638400,
    },
  ],
};

const middlewre = [thunk, logger];

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
  appState: AppStateInterfac;
}

export class RootStateForSave {
  userSubmissions: SubmissionStateType;
  problemList: ProblemListStateInterface;
  contestList: ContestListStateInterface;
  userList: any;
  sharedProblems: any;
  appState: AppStateInterfac;
}

const newCombinedReducers = (state: any, action: any): RootStateType => {
  const intermediateReducer = combinedReducers(state, action);

  return {
    userSubmissions: intermediateReducer.userSubmissions,
    problemList: intermediateReducer.problemList,
    contestList: intermediateReducer.contestList,
    userList: intermediateReducer.userList,
    sharedProblems: intermediateReducer.sharedProblems,
    appState: intermediateReducer.appState,
  };
};

const saveToLocalStorage = (state: RootStateType) => {
  try {
    const newState = {
      userList: state.userList,
      appState: state.appState,
    };
    const serializedState: string = JSON.stringify(newState);
    localStorage.setItem("state", serializedState);
  } catch (e) {
    console.log(e);
  }
};

const loadFromLocalStorage = (): any => {
  try {
    const serialLizedState = localStorage.getItem("state");
    console.log(serialLizedState);
    if (serialLizedState == null) return {};
    const persedData = JSON.parse(serialLizedState);
    console.log(persedData);
    return persedData;
  } catch (e) {
    console.log(e);
    return {};
  }
};

const store = createStore(
  newCombinedReducers,
  loadFromLocalStorage(),
  applyMiddleware(...middlewre)
);

store.subscribe(() => saveToLocalStorage(store.getState()));

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

export default store;
