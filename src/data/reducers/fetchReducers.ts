import { Contest } from "../../util/DataTypes/Contest";
import Problem from "../../util/DataTypes/Problem";
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

export interface ProblemListInitialStateInterface {
  problems: Problem[];
  error: string;
  tags: Set<string>;
  loading: boolean;
}

const problemListInitialState: ProblemListInitialStateInterface = {
  problems: [],
  error: "",
  tags: new Set<string>(),
  loading: false,
};

export const problemListReducer = (
  initState = problemListInitialState,
  action
) => {
  switch (action.type) {
    case FETCH_PROBLEM_LIST:
      action.payload.sort(sortByContestId);
      let tags = new Set<string>();

      for (let problem of action.payload)
        for (let tag of problem.tags) tags.add(tag);

      return {
        ...problemListInitialState,
        problems: action.payload as Problem[],
        error: "",
        tags: tags,
      };

    case ERROR_FETCHING_PROBLEMS:
      return { ...problemListInitialState, error: action.payload as string };

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

export interface ContestListInitialStateInterface {
  contests: Contest[];
  error: string;
  loading: boolean;
}

const contestListInitialState: ContestListInitialStateInterface = {
  contests: [],
  error: "",
  loading: false,
};

export const contestReducer = (initState = contestListInitialState, action) => {
  switch (action.type) {
    case FETCH_CONTEST_LIST:
      return {
        ...contestListInitialState,
        ...{ contests: action.payload as Contest[], error: "" },
      };
    case ERROR_FETCHING_CONTEST_LIST:
      return { ...contestListInitialState, error: action.payload as string };
    case LOADING_CONTEST_LIST:
      return { ...contestListInitialState, loading: true };
    default:
      return initState;
  }
};
