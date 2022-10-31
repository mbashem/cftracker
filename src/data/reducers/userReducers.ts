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

import Submission from "../../util/DataTypes/Submission";

import { sortByCompare } from "../../util/sortMethods";

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

export class SubmissionStateType {
  error: string;
  loading: number;
  id: number;
  submissions: Submission[];

  constructor() {
    this.submissions = new Array<Submission>();
    this.error = "";
    this.loading = 0;
    this.id = 0;
  }

  clone = (): SubmissionStateType => {
    const cloned: SubmissionStateType = new SubmissionStateType();

    cloned.error = this.error;
    cloned.loading = this.loading;
    cloned.id = this.id;
    cloned.submissions = this.submissions;

    return cloned;
  };
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
      let new_loading = initState.loading - 1;
      if (action.payload.id === initState.id) currentState = initState.clone();
      else if (action.payload.id > initState.id) {
        currentState = new SubmissionStateType();
        currentState.id = action.payload.id;
      } else {
        currentState = initState.clone();
        currentState.loading = new_loading;
        return currentState;
      }
      currentState.loading = new_loading;
      currentState.error = "";

      action.payload.result.forEach((element) => {
        currentState.submissions.push(new Submission(element));
      });

      currentState.submissions.sort(sortByCompare);

      return currentState;
    case ERROR_FETCHING_USER_SUBMISSIONS:
      currentState = initState.clone();
      currentState.error = action.payload;
      currentState.loading -= 1;
      return currentState;
    case LOADING_USER_SUBMISSIONS:
      currentState = initState.clone();
      currentState.error = "";
      currentState.loading += 1;
      return currentState;
    default:
      return initState;
  }
};
