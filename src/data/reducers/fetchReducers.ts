import Contest from "../../util/DataTypes/Contest";
import Problem, { ProblemShared } from "../../util/DataTypes/Problem";
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

export interface ProblemListStateInterface {
  problems: Problem[];
  error: string;
  tags: Set<string>;
  loading: boolean;
}

const problemListState: ProblemListStateInterface = {
  problems: [],
  error: "",
  tags: new Set<string>(),
  loading: true,
};

export const problemListReducer = (initState = problemListState, action) => {
  switch (action.type) {
    case FETCH_PROBLEM_LIST:
      action.payload.sort(sortByContestId);
      let tags = new Set<string>();

      for (let problem of action.payload)
        for (let tag of problem.tags) tags.add(tag);

      return {
        ...problemListState,
        problems: action.payload as Problem[],
        error: "",
        tags: tags,
        loading: false,
      };

    case ERROR_FETCHING_PROBLEMS:
      return { ...problemListState, error: action.payload as string };

    case LOADING_PROBLEM_LIST:
      return { ...problemListState, loading: true };
    default:
      return initState;
  }
};

export interface SharedProblemInterface {
  problems: ProblemShared[];
  error: string;
  loading: boolean;
}

const sharedProblemsState: SharedProblemInterface = {
  problems: [],
  error: "",
  loading: true,
};

export const sharedProblemsReducer = (
  initState: SharedProblemInterface = sharedProblemsState,
  action
) => {
  switch (action.type) {
    case FETCH_SHARED_PROBLEMS:
      action.payload.sort(sortByContestId);
      return {
        ...sharedProblemsState,
        ...{ problems: action.payload as ProblemShared[], loading: false },
      };
    case ERROR_FETCHING_SHARED_PROBLEMS:
      return { ...initState, error: action.payload };
    case LOADING_SHARED_PROBLEMS:
      return { ...initState, loading: true };
    default:
      return initState;
  }
};

export interface ContestListStateInterface {
  contests: Contest[];
  error: string;
  loading: boolean;
}

const contestListInitialState: ContestListStateInterface = {
  contests: [],
  error: "",
  loading: true,
};

export const contestReducer = (initState = contestListInitialState, action) => {
  switch (action.type) {
    case FETCH_CONTEST_LIST:
      return {
        ...contestListInitialState,
        ...{ contests: action.payload as Contest[], error: "", loading: false },
      };
    case ERROR_FETCHING_CONTEST_LIST:
      return { ...contestListInitialState, error: action.payload as string };
    case LOADING_CONTEST_LIST:
      return { ...contestListInitialState, loading: true };
    default:
      return initState;
  }
};
