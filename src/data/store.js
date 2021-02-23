import { applyMiddleware, combineReducers, createStore } from "redux";
import logger from "redux-logger";
import thunk from "redux-thunk";
import {
  userSubmissionsReducer,
  problemListReducer,
  errorReducer,
  unsolvedProblemsReducer,
  contestReducer,
} from "./reducers/fetchReducers";

export const contestList = {
  status: "OK",
  result: [
    {
      id: 1476,
      name: "Educational Codeforces Round 103 (Rated for Div. 2)",
      type: "ICPC",
      phase: "FINISHED",
      frozen: false,
      durationSeconds: 7200,
      startTimeSeconds: 1611930900,
      relativeTimeSeconds: 418636,
    },
  ],
};

const problem = {
  status: "OK",
  result: {
    problems: [
      {
        contestId: 1478,
        index: "C",
        name: "Nezzar and Symmetric Array",
        type: "PROGRAMMING",
        points: 1500,
        rating: 1700,
        tags: ["implementation", "math", "sortings"],
      },
    ],
  },
};

const submissions = {
  status: "OK",
  result: [
    {
      id: 105129023,
      contestId: 1368,
      creationTimeSeconds: 1611387508,
      relativeTimeSeconds: 2147483647,
      problem: {
        contestId: 1368,
        index: "D",
        name: "AND, OR and square sum",
        type: "PROGRAMMING",
        points: 1750,
        rating: 1700,
        tags: ["bitmasks", "greedy", "math"],
      },
      author: {
        contestId: 1368,
        members: [{ handle: "bashem" }],
        participantType: "PRACTICE",
        ghost: false,
        startTimeSeconds: 1592491500,
      },
      programmingLanguage: "GNU C++14",
      verdict: "OK",
      testset: "TESTS",
      passedTestCount: 17,
      timeConsumedMillis: 109,
      memoryConsumedBytes: 1638400,
    },
  ],
};

const middlewre = [thunk, logger];

const combinedReducers = combineReducers({
  userSubmissions: userSubmissionsReducer,
  problemList: problemListReducer,
  contestList: contestReducer,
});

const newCombinedReducers = (state, action) => {
  const intermediateReducer = combinedReducers(state, action);
  //console.log(intermediateReducer.problemList);

  return {
    userSubmissions: intermediateReducer.userSubmissions,
    problemList: {
      problems: intermediateReducer.problemList.problems,
      error: intermediateReducer.problemList.error,
      tags: intermediateReducer.problemList.tags,
    },
    contestList: intermediateReducer.contestList,
  };
};

const store = createStore(
  newCombinedReducers,
  {},
  applyMiddleware(...middlewre)
);

export default store;
