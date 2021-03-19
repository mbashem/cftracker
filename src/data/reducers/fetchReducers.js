import { sortByContestId } from "../../util/sortMethods";
import {
  ERROR_FETCHING_CONTEST_LIST,
  ERROR_FETCHING_PROBLEMS,
  ERROR_FETCHING_SHARED_PROBLEMS,
  FETCH_CONTEST_LIST,
  FETCH_PROBLEM_LIST,
  FETCH_SHARED_PROBLEMS,
  LOADING_CONTEST_LIST,
  LOADING_PROBLEM_LIST,
  LOADING_SHARED_PROBLEMS,
} from "../actions/types";

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

const sharedProblemsInitialState = {
  problems: [],
  error: "",
  loading: false,
};

export const sharedProblemsReducer = (
  initState = sharedProblemsInitialState,
  action
) => {
  switch (action.type) {
    case FETCH_SHARED_PROBLEMS:
      action.payload.sort(sortByContestId);
      return {
        ...sharedProblemsInitialState,
        problems: action.payload,
      };
    case ERROR_FETCHING_SHARED_PROBLEMS:
      return { ...initState, error: action.payload };
    case LOADING_SHARED_PROBLEMS:
      return { ...initState, loading: true };
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
