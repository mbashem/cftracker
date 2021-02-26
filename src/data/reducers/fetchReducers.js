import { sortByContestId } from "../../util/sortMethods";
import {
  ERROR_FETCHING,
  ERROR_FETCHING_CONTEST_LIST,
  ERROR_FETCHING_PROBLEMS,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_CONTEST_LIST,
  FETCH_PROBLEM_LIST,
  FETCH_USER_SUBMISSIONS,
  LOADING_CONTEST_LIST,
  LOADING_PROBLEM_LIST,
  LOADING_USER_SUBMISSIONS,
} from "../actions/types";

export const SOLVED_PROBLEMS = "solvedProblems";
export const ATTEMPTED_PROBLEMS = "attemptedProblems";
export const SOLVED_CONTESTS = "solvedContests";
export const ATTEMPTED_CONTESTS = "attemptedContests";

const submissionsInitialState = {
  [SOLVED_PROBLEMS]: new Set(),
  [ATTEMPTED_PROBLEMS]: new Set(),
  [SOLVED_CONTESTS]: new Set(),
  [ATTEMPTED_CONTESTS]: new Set(),
  error: "",
  loading: false,
};

export const userSubmissionsReducer = (
  initState = submissionsInitialState,
  action
) => {
  let currentState = submissionsInitialState;
  switch (action.type) {
    case FETCH_USER_SUBMISSIONS:
      action.payload.forEach((element) => {
        let contestId = element.problem.contestId.toString();
        let verdict = element.verdict;
        let problemIndex = element.problem.index;
        if (verdict === "OK") {
          currentState[SOLVED_PROBLEMS].add(contestId + problemIndex);
          currentState[SOLVED_CONTESTS].add(contestId);
        } else {
          currentState[ATTEMPTED_PROBLEMS].add(contestId + problemIndex);
          currentState[ATTEMPTED_CONTESTS].add(contestId);
        }
      });

      for (let id of currentState[SOLVED_PROBLEMS]) {
        currentState[ATTEMPTED_PROBLEMS].delete(id);
      }

      for (let contestId of currentState[SOLVED_CONTESTS])
        currentState[ATTEMPTED_CONTESTS].delete(contestId);

      return {
        ...submissionsInitialState,
        ...currentState,
      };
    case ERROR_FETCHING_USER_SUBMISSIONS:
      return {
        ...submissionsInitialState,
        error: "Error Fetching Submissions",
      };
    case LOADING_USER_SUBMISSIONS:
      return {
        ...submissionsInitialState,
        loading: true,
      };
    default:
      return initState;
  }
};

const problemListInitialState = {
  problems: [],
  error: "",
  tags: new Set(),
  loading: false,
};

export const problemListReducer = (
  initState = problemListInitialState,
  action
) => {
  switch (action.type) {
    case FETCH_PROBLEM_LIST:
      action.payload.sort(sortByContestId);
      let tags = new Set();

      for (let problem of action.payload)
        for (let tag of problem.tags) tags.add(tag);

      return {
        ...problemListInitialState,
        problems: action.payload,
        error: "",
        tags: tags,
      };
    case ERROR_FETCHING_PROBLEMS:
      return { ...problemListInitialState, error: action.payload };
    case LOADING_PROBLEM_LIST:
      return { ...problemListInitialState, loading: true };
    default:
      return initState;
  }
};

const contestListInitialState = { contests: [], error: "", loading: false };

export const contestReducer = (initState = contestListInitialState, action) => {
  switch (action.type) {
    case FETCH_CONTEST_LIST:
      return {
        ...contestListInitialState,
        ...{ contests: action.payload, error: "" },
      };
    case ERROR_FETCHING_CONTEST_LIST:
      return { ...contestListInitialState, error: action.payload };
    case LOADING_CONTEST_LIST:
      return { ...contestListInitialState, loading: true };
    default:
      return initState;
  }
};
