// import { FETCH_POSTS, NEW_POST } from './types';

import {
  ERROR_FETCHING,
  ERROR_FETCHING_CONTEST_LIST,
  ERROR_FETCHING_PROBLEMS,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_CONTEST_LIST,
  FETCH_PROBLEM_LIST,
  FETCH_USER_SUBMISSIONS,
  FINISHED,
} from "./types";
import store from "../store";

import { useDispatch } from "react-redux";

const allContest = "https://codeforces.com/api/contest.list";
let id = 5,
  user = "h";
const individualContestURL =
  "https://codeforces.com/api/contest.status?contestId=" +
  id +
  "&handle=" +
  user;
let contestId = 5;
const path = "https://codeforces.com/contest/" + contestId;
const problemSet = "https://codeforces.com/api/problemset.problems";
const userStatus = "https://codeforces.com/api/user.status?handle=bashem";

const errorFecthing = (type, message) => {
  return {
    type: type,
    payload: message,
  };
};

export const fetchUserSubmissions = (dispatch) => {
  //  const dispatch = useDispatch();

  // console.log("fetchUSerSubmissions");
  fetch(userStatus)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result.status !== "OK")
          return errorFecthing(
            ERROR_FETCHING_USER_SUBMISSIONS,
            "Status Failed"
          );
        console.log(result);
        return dispatch({
          type: FETCH_USER_SUBMISSIONS,
          payload: result.result,
        });
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (error) => {
        return dispatch(
          errorFecthing(
            ERROR_FETCHING_USER_SUBMISSIONS,
            "ERROR in User Submission" + error
          )
        );
      }
    )
    .catch((e) => {
      // console.log(e);
      return dispatch(
        errorFecthing(
          ERROR_FETCHING_USER_SUBMISSIONS,
          "ERROR in User Submission" + e
        )
      );
    });
};

export const fetchProblemList = (dispatch) => {
  //const dispatch = useDispatch();
  //console.log("FetchProblemList");
  //return (dispatch) => {
  fetch(problemSet)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result.status !== "OK")
          return dispatch(
            errorFecthing(ERROR_FETCHING_PROBLEMS, "Problem Status Failed")
          );
        //   console.log(result);
        let problems = result.result.problems;
        problems = problems.filter((problem) => ("contestId" in problem));
        console.log(result.result);
        for (let i = 0; i < result.result.problemStatistics.length; i++) {
          if (!("rating" in problems[i])) problems[i]["rating"] = -1;
          problems[i]["solvedCount"] =
            result.result.problemStatistics[i].solvedCount;
          problems[i]["id"] = problems[i].contestId.toString()+problems[i].index;
        }


        return dispatch({
          type: FETCH_PROBLEM_LIST,
          payload: problems,
        });
        //	console.log(result.result.length)
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (error) => {
        console.log(error);
      }
    )
    .catch((e) => {
      //  console.log(e);
      return dispatch(
        errorFecthing(ERROR_FETCHING_PROBLEMS, "ERROR in PROBLEM LIST")
      );
    });
};

export const fetchContestList = (dispatch) => {
  fetch(allContest)
    .then((res) => res.json())
    .then(
      (result) => {
        if (result.status !== "OK")
          return dispatch(
            errorFecthing(
              ERROR_FETCHING_CONTEST_LIST,
              "FAiled to fethc contestList"
            )
          );
        //   console.log(result);
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
        console.log(error);
      }
    )
    .catch((e) => {
      //  console.log(e);
      return dispatch(
        errorFecthing(
          ERROR_FETCHING_CONTEST_LIST,
          "FAiled to fethc contestList"
        )
      );
    });
};
