import {
  ADD_USER,
  CLEAR_USERS,
  CLEAR_USERS_SUBMISSIONS,
  ERROR_FETCHING_USER,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_USER_SUBMISSIONS,
  LOADING_USERS,
  LOADING_USER_SUBMISSIONS,
  REMOVE_USER,
} from "../actions/types";

import Submission, { Verdict } from "../../util/DataTypes/Submission";

import {
  SOLVED_PROBLEMS,
  ATTEMPTED_PROBLEMS,
  SOLVED_CONTESTS,
  ATTEMPTED_CONTESTS,
} from "../../util/constants";
import { sortByCompare, sortSubmissions } from "../../util/sortMethods";

const userInitialState = {
  handles: [],
  error: "",
  loading: false,
  id: 0,
};

export const userReducer = (initState = userInitialState, action) => {
  let newState = { ...initState, loading: false };
  switch (action.type) {
    case LOADING_USERS:
      return { ...userInitialState, loading: true };
    case ADD_USER:
      if (action.payload.id < initState.id) {
        return newState;
      }
      if (action.payload.id > initState.id)
        newState.handles = new Array<string>();
      newState.handles.push(action.payload.handle);
      newState.id = action.payload.id;
      return newState;
    case REMOVE_USER:
      newState.handles = initState.handles.filter(
        (handle) => handle !== action.payload.handle
      );
      return newState;
    case ERROR_FETCHING_USER:
      return {
        handles: [],
        error: "",
        loading: false,
      };
    case CLEAR_USERS:
      return {
        handles: [],
        error: "",
        loading: false,
      };
    default:
      return initState;
  }
};

export class SubmissionStateForSave {
  [Verdict.OK]: {
    problems: Array<string>;
    contests: Array<number>;
  };
  [Verdict.WRONG_ANSWER]: {
    problems: Array<string>;
    contests: Array<number>;
  };
  error: string;
  loading: boolean;
  id: number;
}

export class SubmissionStateType {
  [SOLVED_PROBLEMS]: Set<string>;
  [ATTEMPTED_PROBLEMS]: Set<string>;
  [SOLVED_CONTESTS]: Set<number>;
  [ATTEMPTED_CONTESTS]: Set<number>;
  error: string;
  loading: boolean;
  id: number;
  submissions: Submission[];

  constructor() {
    this[SOLVED_PROBLEMS] = new Set<string>();
    this[ATTEMPTED_PROBLEMS] = new Set<string>();
    this[SOLVED_CONTESTS] = new Set<number>();
    this[ATTEMPTED_CONTESTS] = new Set<number>();
    this.submissions = new Array<Submission>();
    this.error = "";
    this.loading = false;
    this.id = 0;
  }

  clone = (): SubmissionStateType => {
    const cloned: SubmissionStateType = new SubmissionStateType();

    cloned[SOLVED_PROBLEMS] = this[SOLVED_PROBLEMS];
    cloned[ATTEMPTED_PROBLEMS] = this[ATTEMPTED_PROBLEMS];
    cloned[SOLVED_CONTESTS] = this[SOLVED_CONTESTS];
    cloned[ATTEMPTED_CONTESTS] = this[ATTEMPTED_CONTESTS];
    cloned.error = this.error;
    cloned.loading = this.loading;
    cloned.id = this.id;
    cloned.submissions = this.submissions;

    return cloned;
  };

  // problemStatus = (problemId: string) => {
  //   if (this[SOLVED_PROBLEMS].has(problemId)) return Verdict.OK;
  //   if (this[ATTEMPTED_PROBLEMS].has(problemId)) return Verdict.WRONG_ANSWER;
  //   return Verdict.NOT_FOUND;
  // };

  // contestStatus = (contestId: number) => {
  //   if (this[SOLVED_CONTESTS].has(contestId)) return Verdict.OK;
  //   if (this[ATTEMPTED_CONTESTS].has(contestId)) return Verdict.WRONG_ANSWER;
  //   return Verdict.NOT_FOUND;
  // };
}

const submissionsInitialState: SubmissionStateType = new SubmissionStateType();

export const userSubmissionsReducer = (
  initState = submissionsInitialState,
  action
) => {
  let currentState: SubmissionStateType;
  switch (action.type) {
    case CLEAR_USERS_SUBMISSIONS:
      return new SubmissionStateType();
    case FETCH_USER_SUBMISSIONS:
      if (action.payload.id === initState.id) currentState = initState.clone();
      else if (action.payload.id > initState.id) {
        currentState = new SubmissionStateType();
        currentState.id = action.payload.id;
      } else return initState;

      action.payload.result.forEach((element) => {
        let contestId = element.problem.contestId;
        let verdict = element.verdict;
        let problemIndex = element.problem.index;
        if (verdict === "OK") {
          currentState[SOLVED_PROBLEMS].add(
            contestId.toString() + problemIndex
          );
          currentState[SOLVED_CONTESTS].add(contestId);
        } else {
          currentState[ATTEMPTED_PROBLEMS].add(
            contestId.toString() + problemIndex
          );
          currentState[ATTEMPTED_CONTESTS].add(contestId);
        }
        currentState.submissions.push(new Submission(element));
      });

      currentState.submissions.sort(sortByCompare);

      for (let id of Array.from(currentState[SOLVED_PROBLEMS].values())) {
        currentState[ATTEMPTED_PROBLEMS].delete(id);
      }

      for (let contestId of Array.from(currentState[SOLVED_CONTESTS].values()))
        currentState[ATTEMPTED_CONTESTS].delete(contestId);

      return currentState;
    case ERROR_FETCHING_USER_SUBMISSIONS:
      return {
        ...initState,
        ...{ error: "Error Fetching Submissions", loading: false },
      };
    case LOADING_USER_SUBMISSIONS:
      currentState = initState.clone();
      currentState.loading = true;
      return currentState;
    default:
      return initState;
  }
};
