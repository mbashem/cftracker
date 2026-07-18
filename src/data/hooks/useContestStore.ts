import { createSelector } from "@reduxjs/toolkit";
import Contest from "../../types/CF/Contest";
import Problem, { ProblemLite, ProblemShared } from "../../types/CF/Problem";
import lowerBound from "../../util/lowerBound";
import { useAppSelector } from "../store";
import { useMemo } from "react";
import { isDefined } from "../../util/util";
import useProblemsStore from "./useProblemsStore";
import { codeforcesApi } from "../queries/codeforcesQuery";

const addSharedToProblems = (
  problemList: Problem[],
  sharedProblems: ProblemShared[],
  contestList: Contest[]
): Contest[] => {
  let addProblems: Problem[] = new Array<Problem>();
  let added: Set<string> = new Set<string>();

  for (let problem of sharedProblems) {
    let currentProblem: ProblemShared = new ProblemShared(
      problem.contestId,
      problem.index,
      problem.shared
    );

    let lb: number = lowerBound(problemList, currentProblem as ProblemLite);

    if (lb !== problemList.length && problemList[lb].equal(currentProblem)) {
      for (let sharedProblem of problem.shared ?? []) {
        if (added.has(sharedProblem.id)) continue;
        if (sharedProblem.contestId === undefined) continue;
        const newProblem: Problem = new Problem(
          sharedProblem.contestId,
          sharedProblem.index,
          problemList[lb].name,
          problemList[lb].type,
          problemList[lb].rating,
          problemList[lb].getTags(),
          problemList[lb].solvedCount
        );

        addProblems.push(newProblem);
        added.add(newProblem.id);
      }
    }
  }

  let rec: Record<number, number> = {};

  let newProblems: Problem[] = problemList.concat(addProblems);

  let newConestList: Contest[] = new Array<Contest>();

  contestList.map((contest) => {
    newConestList.push(contest.clone());
    rec[contest.id] = newConestList.length - 1;
  });

  for (let problem of newProblems) {
    if (isDefined(problem.contestId) && isDefined(rec[problem.contestId]))
      newConestList[rec[problem.contestId]].addProblem(problem);
  }

  return newConestList;
};

const calculateContests = createSelector(
  [
    (state: any) => state.problems,
    (state: any) => state.sharedProblems,
    (state: any) => state.contests
  ],
  (problems, sharedProblems, contests) => {
    return addSharedToProblems(problems, sharedProblems, contests);
  }
);

function useContestStore() {
  const { problemList } = useProblemsStore();
  const { data, error, isLoading } = codeforcesApi.useGetContestQuery();
  const state = useAppSelector(state => {
    return {
      sharedProblems: state.sharedProblems.problems
    };
  });

  const contests = useMemo(
    () => calculateContests({
      contests: data?.contests ?? [],
      problems: problemList.problems,
      sharedProblems: state.sharedProblems,
    }),
    [data?.contests, problemList.problems, state.sharedProblems]
  );

  const contestListError = error === undefined ? data?.error : "Failed to load saved contestList.";

  return {
    error: contestListError,
    loading: isLoading || (data?.loading ?? false),
    contests,
    isContestListLoading: isLoading || (data?.loading ?? false),
    contestListError,
  };
}

export default useContestStore;
