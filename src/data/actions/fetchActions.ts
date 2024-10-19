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

// const allContestURL = "https://codeforces.com/api/contest.list?lang=en";
const problemSetURL = "https://codeforces.com/api/problemset.problems?lang=en";

export const fetchProblemList = (dispatch: AppDispatch) => {
  dispatch(loadingProblems());
  import("../saved_api/problems_data")
    .then(
      (data) => {
        let result = data.problem_data;
  // fetch(problemSetURL)
  //   .then((res) => res.json())
  //   .then(
  //     (result) => {
        if (result.status !== "OK")
          return dispatch(
            errorFetchingProblems({ error: "Failed to fetch Problems list from CF API" })
          );
        //   console.log(result);
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
        for (let i = 0; i < problems.length; i++) {
          problems[i].rating = problems[i].rating ?? 0;
          problems[i].solvedCount = problems[i].solvedCount ?? 0;
          if (problems[i].contestId === undefined) continue;
          finalProblemArray.push(
            new Problem(
              problems[i].contestId!,
              problems[i].index,
              problems[i].name,
              problems[i].type,
              problems[i].rating,
              problems[i].tags,
              problemStatistics[i].solvedCount
            )
          );
        }

        return dispatch(addProblems({ problems: finalProblemArray }));
        //	console.log(result.result.length)
      },
      // Note: it's important to handle errors here
      // instead of a catch() block so that we don't swallow
      // exceptions from actual bugs in components.
      (_error) => {
        return dispatch(errorFetchingProblems({ error: "Failed to fetch Problems list from CF API." }));
      }
    )
    .catch((_e) => {
      //  console.log(e);
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
