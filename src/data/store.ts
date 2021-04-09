import { applyMiddleware, combineReducers, createStore } from "redux";
import logger from "redux-logger";
import thunk from "redux-thunk";
import {
  problemListReducer,
  contestReducer,
  sharedProblemsReducer,
} from "./reducers/fetchReducers";
import { userSubmissionsReducer, userReducer } from "./reducers/userReducers";
import {
  SOLVED_PROBLEMS,
  ATTEMPTED_PROBLEMS,
  SOLVED_CONTESTS,
  ATTEMPTED_CONTESTS,
} from "../util/constants";

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

const failedUserFethc = {
  status: "FAILED",
  comment: "handles: User with handle b not found",
};

const middlewre = [thunk, logger];

const combinedReducers = combineReducers({
  userSubmissions: userSubmissionsReducer,
  problemList: problemListReducer,
  contestList: contestReducer,
  userList: userReducer,
  sharedProblems: sharedProblemsReducer,
});

interface RootReducersType {
  
}

const newCombinedReducers = (state, action) => {
  const intermediateReducer = combinedReducers(state, action);
  //console.log(intermediateReducer.problemList);

  // const submissionsInitialState = {
  //   [SOLVED_PROBLEMS]: new Set(),
  //   [ATTEMPTED_PROBLEMS]: new Set(),
  //   [SOLVED_CONTESTS]: new Set(),
  //   [ATTEMPTED_CONTESTS]: new Set(),
  //   error: "",
  //   loading: false,
  //   id: intermediateReducer.userSubmissions.id,
  // };

  // const related = intermediateReducer.sharedProblems.problems;
  // const getSharedIndex = (contestId, index) => {
  //   let l = 0,
  //     r = related.length - 1;

  //   while (l <= r) {
  //     let mid = l + ((r - l) >> 2);
  //     if (related[mid].contestId === contestId && related[mid].index === index)
  //       return mid;
  //     if (
  //       related[mid].contestId > contestId ||
  //       (related[mid].contestId === contestId && related[mid].index > index)
  //     )
  //       r = mid - 1;
  //     else l = mid + 1;
  //   }

  //   return -1;
  // };

  return {
    userSubmissions: intermediateReducer.userSubmissions,
    problemList: {
      problems: intermediateReducer.problemList.problems,
      error: intermediateReducer.problemList.error,
      tags: intermediateReducer.problemList.tags,
      loading: intermediateReducer.problemList.loading,
    },
    contestList: {
      contests: intermediateReducer.contestList.contests,
      error: intermediateReducer.contestList.error,
      loading: intermediateReducer.contestList.loading,
      problems: intermediateReducer.problemList.problems,
    },
    userList: intermediateReducer.userList,
    sharedProblems: intermediateReducer.sharedProblems,
  };
};

const store = createStore(
  newCombinedReducers,
  {},
  applyMiddleware(...middlewre)
);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export default store;
