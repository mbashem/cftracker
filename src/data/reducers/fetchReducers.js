import {
  ERROR_FETCHING,
  FETCH_POSTS,
  FETCH_PROBLEM_LIST,
  FETCH_USER_SUBMISSIONS,
  LOADING,
} from "../actions/types";
import store from "../store";

// Map problem <key,<key,[]>> => <problemId:string,<Verdict:string,[Array]>>
// contestAttempted => {contestId: {solvedIndex: [],attemptedIndex:[]}};

const submissionsInitialStore = {
  solvedProblems: new Set(),
  attemptedProblems: new Set(),
};

export function userSubmissionsReducer(
  initState = submissionsInitialStore,
  action
) {
  // console.log(action);
  let currentState = {
    solvedProblems: new Set(),
    attemptedProblems: new Set(),
  };
  if (action.type === FETCH_USER_SUBMISSIONS) {
    action.payload.forEach((element) => {
      let contestId = element.problem.contestId.toString();
      let verdict = element.verdict;
      let problemIndex = element.problem.index;
      if (verdict == "OK") {
        currentState.solvedProblems.add(contestId + problemIndex);
      } else {
        currentState.attemptedProblems.add(contestId + problemIndex);
      }

      // if (!(contestId in currentState)) currentState[contestId] = {};
      // if (!(problemIndex in currentState[contestId]))
      //   currentState[contestId][problemIndex] = {};
      // if (!(verdict in currentState[contestId][problemIndex]))
      //   currentState[contestId][problemIndex][verdict] = [];
      // let submissionId = element.id;

      // currentState[contestId][problemIndex][verdict].push(submissionId);
    });

    for (let item of currentState.solvedProblems) {
      currentState.attemptedProblems.delete(item);
    }

    // return { ...initState, problems: currentState };
    return currentState;
  }
  // console.log("CurrentState:");
  //console.log(currentState);

  return initState;
}

const problemList = { problems: [] };

export function problemListReducer(initState = problemList, action) {
  // console.log(action);
  // console.log(problemList);
  if (action.type === FETCH_PROBLEM_LIST) {
    return {
      problems: action.payload,
    };
  }

  return initState;
}

export function errorReducer(initState = "", action) {
  // console.log(action);
  //console.log(initState);
  if (action.type == ERROR_FETCHING) {
    initState = action.payload;
  } else if (action.type == LOADING) {
    initState = action.payload;
  }
  return initState;
}

// export function unsolvedProblemsReducer(initState = {}, action) {
//   let unsolvedProblems = {problems:[]};
//  // let allProblems = store.getState();
//  // console.log(store.getState());
//   return unsolvedProblems;
// }
