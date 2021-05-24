import {
  AppReducerType,
  ERROR_FETCHING_CONTEST_LIST,
  ERROR_FETCHING_PROBLEMS,
  ERROR_FETCHING_SHARED_PROBLEMS,
  FETCH_CONTEST_LIST,
  FETCH_PROBLEM_LIST,
  FETCH_SHARED_PROBLEMS,
  FINISHED,
  LOADING_CONTEST_LIST,
  LOADING_PROBLEM_LIST,
} from "./types";

import Problem, {
  ProblemLite,
  ProblemShared,
  ProblemStatistics,
} from "../../util/DataTypes/Problem";
import { AppDispatch } from "../store";
import Contest from "../../util/DataTypes/Contest";
import { ThemesType } from "../../util/Theme";

const allContestURL = "https://codeforces.com/api/contest.list?lang=en";
const problemSetURL = "https://codeforces.com/api/problemset.problems?lang=en";

export const createDispatch = (type: any, message: any) => {
  return {
    type: type,
    payload: message,
  };
};

export interface AppPayloadType {
  type: AppReducerType;
  payload: {
    isContest: boolean;
    data: string | number | ThemesType;
  };
}

export const changeAppState = (
  dispatch: AppDispatch,
  type: AppReducerType,
  data: number | ThemesType,
  isContest: boolean = false
) => {
  let curr: AppPayloadType = {
    type: type,
    payload: {
      isContest: isContest,
      data: data,
    },
  };
  dispatch(curr);
};

export const load = (type) => {
  return { type: type };
};

export const fetchProblemList = (dispatch: AppDispatch) => {
  dispatch(load(LOADING_PROBLEM_LIST));
  //fetchSharedProblemList(dispatch);
  fetch(problemSetURL)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result.status !== "OK")
          return dispatch(
            createDispatch(ERROR_FETCHING_PROBLEMS, "Problem Status Failed")
          );
        //   console.log(result);
        let problems: Problem[] = result.result.problems;
        let problemStatistics: ProblemStatistics[] =
          result.result.problemStatistics;

        problems = problems.filter((problem) =>
          problem.contestId ? true : false
        );

        problemStatistics = problemStatistics.filter((problem) =>
          problem.contestId ? true : false
        );

        for (let i = 0; i < problems.length; i++) {
          problems[i].rating = problems[i].rating ?? -1;
          problems[i].solvedCount = problemStatistics[i].solvedCount;
          problems[i].id = problems[i].contestId.toString() + problems[i].index;
        }

        const finalProblemArray: Problem[] = [];
        for (let problem of problems) {
          finalProblemArray.push(
            new Problem(
              problem.contestId,
              problem.index,
              problem.name,
              problem.type,
              problem.rating,
              problem.tags,
              problem.solvedCount
            )
          );
        }

        return dispatch(createDispatch(FETCH_PROBLEM_LIST, finalProblemArray));
        //	console.log(result.result.length)
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (error) => {
        return dispatch(
          createDispatch(
            ERROR_FETCHING_PROBLEMS,
            "ERROR in PROBLEM LIST " + error
          )
        );
      }
    )
    .catch((e) => {
      //  console.log(e);
      return dispatch(
        createDispatch(ERROR_FETCHING_PROBLEMS, "ERROR in PROBLEM LIST")
      );
    });
};

export const fetchSharedProblemList = (dispatch) => {
  import("../jsons/related")
    .then(
      (data) => {
        const result = data.jsonData;
        if (result.status !== "OK")
          return dispatch(
            createDispatch(
              ERROR_FETCHING_SHARED_PROBLEMS,
              "Error fetching shared problems api call failed"
            )
          );
        const res: ProblemShared[] = result.result as ProblemShared[];

        const send: ProblemShared[] = [];

        for (let shared of res) {
          let curr = new ProblemShared(shared.contestId, shared.index);

          for (let lite of shared.shared)
            curr.shared.push(new ProblemLite(lite.contestId, lite.index));
          send.push(curr);
        }

        return dispatch(createDispatch(FETCH_SHARED_PROBLEMS, send));
      },
      (error) => {
        return dispatch(
          createDispatch(
            ERROR_FETCHING_SHARED_PROBLEMS,
            "Error processing shared problems"
          )
        );
      }
    )
    .catch((e) => {
      console.log(e);
      return dispatch(
        createDispatch(ERROR_FETCHING_SHARED_PROBLEMS, "ERROR in PROBLEM LIST")
      );
    });
};

export const fetchContestList = (dispatch: AppDispatch) => {
  dispatch(load(LOADING_CONTEST_LIST));
  fetch(allContestURL)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result.status !== "OK")
          return dispatch(createDispatch(ERROR_FETCHING_CONTEST_LIST, "Eroor"));
        let contests: Contest[] = [];

        for (let contest of result.result) {
          if (contest.phase === FINISHED && contest.id)
            contests.push(
              new Contest(
                contest.id,
                contest.name,
                contest.type,
                contest.phase,
                contest.durationSeconds,
                contest.startTimeSeconds
              )
            );
        }

        return dispatch({
          type: FETCH_CONTEST_LIST,
          payload: contests,
        });
        //	console.log(result.result.length)
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (error) => {
        return dispatch(
          createDispatch(
            ERROR_FETCHING_CONTEST_LIST,
            "FAiled to fethc contestList " + error
          )
        );
      }
    )
    .catch((e) => {
      //  console.log(e);
      return dispatch(
        createDispatch(
          ERROR_FETCHING_CONTEST_LIST,
          "FAiled to fethc contestList"
        )
      );
    });
};
