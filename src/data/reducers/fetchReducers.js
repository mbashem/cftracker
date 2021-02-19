import { act } from "react-dom/test-utils";
import { sortByContestId } from "../../util/sortMethods";
import {
  ERROR_FETCHING,
  ERROR_FETCHING_CONTEST_LIST,
  ERROR_FETCHING_PROBLEMS,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_CONTEST_LIST,
  FETCH_POSTS,
  FETCH_PROBLEM_LIST,
  FETCH_USER_SUBMISSIONS,
  LOADING,
} from "../actions/types";
import store from "../store";

// Map problem <key,<key,[]>> => <problemId:string,<Verdict:string,[Array]>>
// contestAttempted => {contestId: {solvedIndex: [],attemptedIndex:[]}};

const submissionsInitialStore = {
  solvedProblems: new Set(),
  attemptedProblems: new Set(),
  error: "",
};

export const userSubmissionsReducer = (
  initState = submissionsInitialStore,
  action
) => {
  let currentState = {
    solvedProblems: new Set(),
    attemptedProblems: new Set(),
  };
  switch (action.type) {
    case FETCH_USER_SUBMISSIONS:
      action.payload.forEach((element) => {
        let contestId = element.problem.contestId.toString();
        let verdict = element.verdict;
        let problemIndex = element.problem.index;
        if (verdict == "OK") {
          currentState.solvedProblems.add(contestId + problemIndex);
        } else {
          currentState.attemptedProblems.add(contestId + problemIndex);
        }
      });

      for (let item of currentState.solvedProblems) {
        currentState.attemptedProblems.delete(item);
      }

      // return { ...initState, problems: currentState };
      return {
        ...submissionsInitialStore,
        ...currentState,
      };
    case ERROR_FETCHING_USER_SUBMISSIONS:
      return {
        ...submissionsInitialStore,
        error: "Error Fetching Submissions",
      };
    default:
      return initState;
  }
};

const problemList = { problems: [], error: "" };

export const problemListReducer = (initState = problemList, action) => {
  // console.log(action);
  // console.log(problemList);
  switch (action.type) {
    case FETCH_PROBLEM_LIST:
      action.payload.sort(sortByContestId);
      return {
        ...problemList,
        problems: action.payload,
        error: "",
      };
    case ERROR_FETCHING_PROBLEMS:
      return { ...problemList, error: action.payload };
    default:
      return initState;
  }
};

export const errorReducer = (initState = "", action) => {
  switch (action.type) {
    case ERROR_FETCHING:
      return action.payload;

    case LOADING:
      return action.payload;

    default:
      return "";
  }
};

const contestList = { contests: [], error: "" };

export const contestReducer = (initState = contestList, action) => {
  switch (action.type) {
    case FETCH_CONTEST_LIST:
      return { contests: action.payload, error: "" };
    case ERROR_FETCHING_CONTEST_LIST:
      return { ...contestList, error: action.payload };
    default:
      return initState;
  }
};

// export function unsolvedProblemsReducer(initState = {}, action) {
//   let unsolvedProblems = {problems:[]};
//  // let allProblems = store.getState();
//  // console.log(store.getState());
//   return unsolvedProblems;
// }
