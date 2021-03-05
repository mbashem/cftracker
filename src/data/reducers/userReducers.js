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

import {
  SOLVED_PROBLEMS,
  ATTEMPTED_PROBLEMS,
  SOLVED_CONTESTS,
  ATTEMPTED_CONTESTS,
} from "../../util/constants";
import { act } from "react-dom/test-utils";

const userInitialState = {
  handles: [],
  userInfo: new Map(),
  error: "",
  loading: false,
};

export const userReducer = (initState = userInitialState, action) => {
  let newState = { ...initState, loading: false };
  switch (action.type) {
    case LOADING_USERS:
      return { ...userInitialState, loading: true };
    case ADD_USER:
      newState.handles.push(action.payload.handle);
      newState.userInfo.set(action.payload.handle, action.payload);
      return newState;
    case REMOVE_USER:
      newState.handle = initState.handles.filter(
        (handle) => handle !== action.payload.handle
      );
      newState.userInfo.delete(action.payload.handle);
      return newState;
    case ERROR_FETCHING_USER:
      return {
        handles: [],
        userInfo: new Map(),
        error: "",
        loading: false,
      };
    case CLEAR_USERS:
      return {
        handles: [],
        userInfo: new Map(),
        error: "",
        loading: false,
      };
    default:
      return initState;
  }
};

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
    case CLEAR_USERS_SUBMISSIONS:
      return {
        [SOLVED_PROBLEMS]: new Set(),
        [ATTEMPTED_PROBLEMS]: new Set(),
        [SOLVED_CONTESTS]: new Set(),
        [ATTEMPTED_CONTESTS]: new Set(),
        error: "",
        loading: false,
      };
    case FETCH_USER_SUBMISSIONS:
      action.payload.result.forEach((element) => {
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
        ...initState,
        ...currentState,
      };
    case ERROR_FETCHING_USER_SUBMISSIONS:
      return {
        ...initState,
        error: "Error Fetching Submissions",
      };
    case LOADING_USER_SUBMISSIONS:
      return {
        ...initState,
        loading: true,
      };
    default:
      return initState;
  }
};
