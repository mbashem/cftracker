import { applyMiddleware, combineReducers, createStore } from "redux";
import logger from "redux-logger";
import { thunk } from "redux-thunk";
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
import { AppReducer, AppStateType } from "./reducers/appReducers";
import Problem, { ProblemLite, ProblemShared } from "../util/DataTypes/Problem";
import { sortByCompare } from "../util/sortMethods";
import lowerBound from "../util/lowerBound";
import Contest from "../util/DataTypes/Contest";
import Submission, {
  SubmissionLite,
  Verdict,
} from "../util/DataTypes/Submission";
import { Compared } from "../util/Comparator";

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
  sharedProblems: ProblemShared[],
  contestList: Contest[]
): Contest[] => {
  let addProblems: Problem[] = new Array<Problem>();
  let added: Set<string> = new Set<string>();

  for (let problem of sharedProblems) {
    let currentProblem: ProblemShared = new ProblemShared(
      problem.contestId,
      problem.index,
      problem.shared
    );

    let lb: number = lowerBound(problemList, currentProblem as ProblemLite);

    if (lb !== problemList.length && problemList[lb].equal(currentProblem)) {
      for (let sharedProblem of problem.shared) {
        if (added.has(sharedProblem.getId())) continue;
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

  let rec: Record<number, number> = {};

  let newProblems: Problem[] = problemList.concat(addProblems);

  let newConestList: Contest[] = new Array<Contest>();

  contestList.map((contest, index) => {
    newConestList.push(contest);
    rec[contest.id] = newConestList.length - 1;
  });

  for (let problem of newProblems) {
    if (rec[problem.contestId] !== undefined)
      newConestList[rec[problem.contestId]].addProblem(problem);
  }

  return newConestList;
};

const addSharedToSubmissions = (
  userSubmissions: SubmissionStateType,
  sharedProblems: ProblemShared[]
): SubmissionStateType => {
  let currUserSubmissions = userSubmissions.clone();

  let presSubs: Set<string> = new Set<string>();
  let newSubmissions: Submission[] = new Array<Submission>();

  for (let submission of userSubmissions.submissions) {
    let id: string = submission.id.toString() + submission.contestId.toString();
    presSubs.add(id);
  }

  for (let submission of userSubmissions.submissions) {
    let currentShared: ProblemShared = new ProblemShared(
      submission.contestId,
      submission.problem.index
    );

    let lb: number = lowerBound(sharedProblems, currentShared);

    if (
      lb >= sharedProblems.length ||
      currentShared.compareTo(sharedProblems[lb]) !== Compared.EQUAL
    )
      continue;

    if (sharedProblems[lb].shared)
      for (let problem of sharedProblems[lb].shared) {
        let id: string =
          submission.id.toString() + problem.contestId.toString();

        if (presSubs.has(id)) continue;
        presSubs.add(id);
        let newS = new Submission(submission);
        newS.contestId = problem.contestId;
        newS.problem.contestId = problem.contestId;
        newS.problem.index = problem.index;
        newS.author.contestId = problem.contestId;
        newS.fromShared = true;
        newS.index = problem.index;

        if (
          newS.index !== problem.index ||
          newS.problem.index !== problem.index ||
          newS.contestId !== problem.contestId
        ) {
          console.log(newS);
        }

        newSubmissions.push(newS);
      }
  }

  currUserSubmissions.submissions = newSubmissions.concat(
    currUserSubmissions.submissions
  );

  currUserSubmissions.submissions.sort(sortByCompare);

  return currUserSubmissions;
};

const newCombinedReducers = (state: any, action: any): RootStateType => {
  const intermediateReducer = combinedReducers(state, action);

  intermediateReducer.userSubmissions = addSharedToSubmissions(
    intermediateReducer.userSubmissions,
    intermediateReducer.sharedProblems.problems
  );

  intermediateReducer.contestList.contests = addSharedToProblems(
    intermediateReducer.problemList.problems,
    intermediateReducer.sharedProblems.problems,
    intermediateReducer.contestList.contests
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
