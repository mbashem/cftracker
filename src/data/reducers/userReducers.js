import {
  ADD_USER,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_USER_SUBMISSIONS,
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
};

export const userReducer = (initState = userInitialState, action) => {
  let newState = { ...initState };
  switch (action.type) {
    case ADD_USER:
      newState.handles.push(action.payload.handle);
      newState.userInfo.set(action.payload.handle, action.payload.userInfo);
      return newState;
    case REMOVE_USER:
      newState.handle = initState.handles.filter(
        (handle) => handle != action.payload.handle
      );
      newState.userInfo.delete(action.payload.handle);
      return newState;
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
