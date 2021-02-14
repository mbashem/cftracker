// import { FETCH_POSTS, NEW_POST } from './types';

import {
  ERROR_FETCHING,
  FETCH_PROBLEM_LIST,
  FETCH_USER_SUBMISSIONS,
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
const problemSet = "https://codeforces.com/api/problemset.problems";
const userStatus = "https://codeforces.com/api/user.status?handle=bashem";

const errorFecthing = (message) => {
  return {
    type: ERROR_FETCHING,
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
        if (result.status != "OK") return errorFecthing("Status Failed");
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
        console.log(error);
      }
    )
    .catch((e) => {
      // console.log(e);
      return dispatch(errorFecthing("ERROR in User Submission" + e));
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
        if (result.status != "OK")
          return dispatch(errorFecthing("Problem Status Failed"));
        //   console.log(result);
        let problems = result.result.problems;

        for (let i = 0; i < result.result.problemStatistics.length; i++) {
          if (!("rating" in problems[i])) problems[i]["rating"] = -1;
          problems[i]["solvedCount"] =
            result.result.problemStatistics[i].solvedCount;
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
      return dispatch(errorFecthing("ERROR in PROBLEM LIST"));
    });
};

export const fetchContestList = () => {};
