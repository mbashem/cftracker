import Problem, {
  ProblemLite,
  ProblemShared,
  ProblemStatistics,
} from "../../types/CF/Problem";
import { AppDispatch } from "../store";
import Contest from "../../types/CF/Contest";
import { addProblems, errorFetchingProblems, loadingProblems } from "../reducers/problemListSlice";
import { addContestList, errorFetchingContestList, loadingContestList } from "../reducers/contestListSlice";
import { addSharedProblems, errorFetchingSharedProblems } from "../reducers/sharedProblemsSlice";
import { IS_DEBUG_MODE } from "../../util/env";

// const allContestURL = "https://codeforces.com/api/contest.list?lang=en";
const problemSetURL = "https://codeforces.com/api/problemset.problems?lang=en";

interface ProblemSetResult {
  status: string;
  result: {
    problems: Problem[];
    problemStatistics: ProblemStatistics[];
  };
}

function addProblemListFromResult(dispatch: AppDispatch, result: ProblemSetResult) {
  if (result.status !== "OK")
    return dispatch(
      errorFetchingProblems({ error: "Failed to fetch Problems list from CF API" })
    );

  let problems: Problem[] = result.result.problems as Problem[];
  let problemStatistics: ProblemStatistics[] =
    result.result.problemStatistics as ProblemStatistics[];

  problems = problems.filter((problem) =>
    problem.contestId ? true : false
  );

  problemStatistics = problemStatistics.filter((problem) =>
    problem.contestId ? true : false
  );

  const finalProblemArray: Problem[] = [];
  for (let index = 0; index < problems.length; index++) {
    problems[index].rating = problems[index].rating ?? 0;
    problems[index].solvedCount = problems[index].solvedCount ?? 0;
    if (problems[index].contestId === undefined) continue;
    finalProblemArray.push(
      new Problem(
        problems[index].contestId!,
        problems[index].index,
        problems[index].name,
        problems[index].type,
        problems[index].rating,
        problems[index].tags,
        problemStatistics[index]?.solvedCount ?? 0
      )
    );
  }

  return dispatch(addProblems({ problems: finalProblemArray }));
}

export const fetchProblemList = (dispatch: AppDispatch) => {
  dispatch(loadingProblems());

  if (IS_DEBUG_MODE) {
    console.log("CFTracker is running in debug mode. Using local saved problems data.");
    import("../saved_api/problems_data")
      .then((data) => addProblemListFromResult(dispatch, data.problem_data as ProblemSetResult))
      .catch((error) => {
        console.log(error);
        return dispatch(errorFetchingProblems({ error: "Failed to load saved Problems list." }));
      });
    return;
  }

  fetch(problemSetURL)
    .then((response) => response.json())
    .then(
      (result) => {
        return addProblemListFromResult(dispatch, result as ProblemSetResult);
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (error) => {
        console.log(error);
        return dispatch(errorFetchingProblems({ error: "Failed to fetch Problems list from CF API." }));
      }
    )
    .catch((error) => {
      console.log(error);
      return dispatch(errorFetchingProblems({ error: "Failed to fetch Problems list from CF API." }));
    });
};

export const fetchSharedProblemList = async (dispatch: AppDispatch) => {
  import("../saved_api/related")
    .then(
      (data) => {
        const result = data.jsonData;
        if (result.status !== "OK")
          return dispatch(errorFetchingSharedProblems("Error fetching shared problems api call failed"));
        const res: ProblemShared[] = result.result as ProblemShared[];

        const sharedProblems: ProblemShared[] = [];

        for (let shared of res) {
          let curr = new ProblemShared(shared.contestId, shared.index);

          for (let lite of shared.shared ?? [])
            curr.shared?.push(new ProblemLite(lite.contestId!, lite.index));
          sharedProblems.push(curr);
        }

        return dispatch(addSharedProblems(sharedProblems));
      },
      (_error) => {
        return dispatch(errorFetchingSharedProblems("Error processing shared problems"));
      }
    )
    .catch((e) => {
      console.log(e);
      return dispatch(errorFetchingSharedProblems("ERROR in PROBLEM LIST"));
    });
};

export const fetchContestList = async (dispatch: AppDispatch) => {
  dispatch(loadingContestList());

  import("../saved_api/contests_data")
    // .then((res) => res.json())
    .then(
      (data) => {
        let result = data.contests_data;
        if (result.status !== "OK")
          return dispatch(errorFetchingContestList("Eroor"));
        let contests: Contest[] = [];

        for (let contest of result.result) {
          if (contest.id)
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

        return dispatch(addContestList(contests));
        //	console.log(result.result.length)
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (error) => {
        return dispatch(errorFetchingContestList("Failed to fetch contestList " + error));
      }
    )
    .catch((error) => {
      //  console.log(e);
      return dispatch(errorFetchingContestList("Failed to fetch contestList " + error));
    });
};
