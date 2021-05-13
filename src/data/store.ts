import { applyMiddleware, combineReducers, createStore } from "redux";
import logger from "redux-logger";
import thunk from "redux-thunk";
import {
  problemListReducer,
  contestReducer,
  sharedProblemsReducer,
  ContestListStateInterface,
  ProblemListStateInterface,
  SharedProblemInterface,
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
import { AppReducer, AppStateType } from "./reducers/appReducers";
import Contest from "../util/DataTypes/Contest";
import Problem, { ProblemLite, ProblemShared } from "../util/DataTypes/Problem";
import { sortByCompare } from "../util/sortMethods";
import lowerBound from "../util/lowerBound";
import { cursorTo } from "node:readline";
import { AppReducerType } from "./actions/types";

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
  appState: AppStateType;
}

export class RootStateForSave {
  userSubmissions: SubmissionStateType;
  problemList: ProblemListStateInterface;
  contestList: ContestListStateInterface;
  userList: any;
  sharedProblems: SharedProblemInterface;
  appState: AppStateType;
}

const addSharedToProblems = (
  problemList: Problem[],
  sharedProblems: ProblemShared[]
): Problem[] => {
  problemList = [...problemList];
  const addProblems: Problem[] = new Array<Problem>();
  const added: Set<string> = new Set<string>();

  for (let problem of sharedProblems) {
    let currentProblem: ProblemShared = new ProblemShared(
      problem.contestId,
      problem.index,
      problem.shared
    );
    let lb: number = lowerBound(problemList, currentProblem as ProblemLite);
    if (lb != problemList.length && currentProblem.equal(problemList[lb])) {
      for (let sharedProblem of problem.shared) {
        lb = lowerBound(problemList, sharedProblem as ProblemLite);
        if (
          lb == problemList.length ||
          !sharedProblem.equal(problemList[lb]) ||
          added.has(problemList[lb].getId())
        )
          continue;
        const newProblem: Problem = new Problem(
          sharedProblem.contestId,
          sharedProblem.index,
          problemList[lb].name,
          problemList[lb].type,
          problemList[lb].rating,
          problemList[lb].getTags(),
          problemList[lb].solvedCount
        );

        addProblems.push(newProblem);
        added.add(newProblem.getId());
      }
    }
  }

  return problemList.concat(addProblems).sort(sortByCompare);
};

const addSharedToSubmissions = (
  userSubmissions: SubmissionStateType,
  sharedProblems: ProblemShared[]
): SubmissionStateType => {
  let currUserSubmissions = userSubmissions.clone();

  for (let problem of sharedProblems) {
    let currentProblem: ProblemShared = new ProblemShared(
      problem.contestId,
      problem.index,
      problem.shared
    );

    if (userSubmissions[SOLVED_PROBLEMS].has(currentProblem.getId())) {
      for (let sharedProblem of problem.shared) {
        let sharedObject: ProblemShared = new ProblemShared(
          sharedProblem.contestId,
          sharedProblem.index
        );
        currUserSubmissions[SOLVED_PROBLEMS].add(sharedObject.getId());
        if (sharedObject.contestId) {
          currUserSubmissions[SOLVED_CONTESTS].add(sharedObject.contestId);
          // if (sharedObject.contestId == 1508){
          //   console.log(sharedObject.contestId);
          // }
        }
      }
    } else if (
      userSubmissions[ATTEMPTED_PROBLEMS].has(currentProblem.getId())
    ) {
      for (let sharedProblem of problem.shared) {
        let sharedObject: ProblemShared = new ProblemShared(
          sharedProblem.contestId,
          sharedProblem.index
        );

        currUserSubmissions[ATTEMPTED_PROBLEMS].add(sharedObject.getId());
        if (sharedObject.contestId)
          currUserSubmissions[ATTEMPTED_CONTESTS].add(sharedObject.contestId);
      }
    }
  }

  // console.log("What!");

  return currUserSubmissions;
};

const newCombinedReducers = (state: any, action: any): RootStateType => {
  const intermediateReducer = combinedReducers(state, action);

  intermediateReducer.userSubmissions = addSharedToSubmissions(
    intermediateReducer.userSubmissions,
    intermediateReducer.sharedProblems.problems
  );

  intermediateReducer.problemList.problems = addSharedToProblems(
    intermediateReducer.problemList.problems,
    intermediateReducer.sharedProblems.problems
  );

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
