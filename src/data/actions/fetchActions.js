import {
  ERROR_FETCHING_CONTEST_LIST,
  ERROR_FETCHING_PROBLEMS,
  FETCH_CONTEST_LIST,
  FETCH_PROBLEM_LIST,
  FINISHED,
  LOADING_CONTEST_LIST,
  LOADING_PROBLEM_LIST,
} from "./types";

const allContest = "https://codeforces.com/api/contest.list";
const problemSet = "https://codeforces.com/api/problemset.problems";

export const errorFecthing = (type, message) => {
  return {
    type: type,
    payload: message,
  };
};

export const load = (type) => {
  return {type: type}
};

export const fetchProblemList = (dispatch) => {
  dispatch(load(LOADING_PROBLEM_LIST));
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
  dispatch(load(LOADING_CONTEST_LIST));
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
