import {
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

import { jsonData } from "../jsons/related";
import { result } from "lodash";

const allContestURL = "https://codeforces.com/api/contest.list";
const problemSetURL = "https://codeforces.com/api/problemset.problems";
const sharedProblemsURL = "../jsons/related.json";

export const createDispatch = (type, message) => {
  return {
    type: type,
    payload: message,
  };
};

export const load = (type) => {
  return { type: type };
};

export const fetchProblemList = (dispatch) => {
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
        let problems = result.result.problems;
        problems = problems.filter((problem) => "contestId" in problem);
        for (let i = 0; i < result.result.problemStatistics.length; i++) {
          if (!("rating" in problems[i])) problems[i]["rating"] = -1;
          problems[i]["solvedCount"] =
            result.result.problemStatistics[i].solvedCount;
          problems[i]["id"] =
            problems[i].contestId.toString() + problems[i].index;
        }

        return dispatch(createDispatch(FETCH_PROBLEM_LIST, problems));
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
  //console.log(sharedProblemsURL);
  // fetch(sharedProblemsURL)
  //   .then((res) => res.json())
  //   .then(
  //     (result) => {
  //       console.log(result);
  if (jsonData != null) {
    const result = jsonData;
    if (result.status !== "OK")
      return dispatch(
        createDispatch(
          ERROR_FETCHING_SHARED_PROBLEMS,
          "Error fetching shared problems"
        )
      );
    return dispatch(createDispatch(FETCH_SHARED_PROBLEMS, result.result));
    //	console.log(result.result.length)
  } else
    return dispatch(
      createDispatch(ERROR_FETCHING_SHARED_PROBLEMS, "ERROR in PROBLEM LIST")
    );
  //   },
  //   // Note: it's important to handle errors here
  //   // instead of a catch() block so that we don't swallow
  //   // exceptions from actual bugs in components.
  //   (error) => {
  //     return dispatch(
  //       createDispatch(ERROR_FETCHING_SHARED_PROBLEMS, "ERROR in PROBLEM LIST")
  //     );
  //   }
  // )
  // .catch((e) => {
  //     console.log(e);
  //   return dispatch(
  //     createDispatch(ERROR_FETCHING_SHARED_PROBLEMS, "ERROR in PROBLEM LIST")
  //   );
  //});
};

export const fetchContestList = (dispatch) => {
  dispatch(load(LOADING_CONTEST_LIST));
  fetch(allContestURL)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result.status !== "OK")
          return dispatch(createDispatch(ERROR_FETCHING_CONTEST_LIST));
        let res = result.result.filter((contest) => contest.phase === FINISHED);

        return dispatch({
          type: FETCH_CONTEST_LIST,
          payload: res,
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
