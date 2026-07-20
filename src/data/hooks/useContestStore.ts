import { createSelector } from "@reduxjs/toolkit";
import Contest from "../../types/CF/Contest";
import Problem, { ProblemLite, ProblemShared } from "../../types/CF/Problem";
import lowerBound from "../../util/lowerBound";
import { isDefined } from "../../util/util";
import useProblemsStore from "./useProblemsStore";
import { codeforcesApi } from "../queries/codeforcesQuery";
import { ContestData } from "../queries/codeforcesApiResponse";
import useSharedProblemsStore from "./useSharedProblemsStore";

const emptyContests: ContestData[] = [];

const addSharedToProblems = (
  problemList: Problem[],
  sharedProblems: ProblemShared[],
  contestList: ContestData[]
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
    newConestList.push(new Contest(
      contest.id,
      contest.name,
      contest.type,
      contest.phase,
      contest.durationSeconds,
      contest.startTimeSeconds
    ));
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
    (problems: Problem[]) => problems,
    (_problems: Problem[], sharedProblems: ProblemShared[]) => sharedProblems,
    (_problems: Problem[], _sharedProblems: ProblemShared[], contests: ContestData[]) => contests,
  ],
  addSharedToProblems
);

function useContestStore() {
  const { problemList } = useProblemsStore();
  const { sharedProblems } = useSharedProblemsStore();
  const { data, error, isLoading } = codeforcesApi.useGetContestQuery();
  const contests = calculateContests(
    problemList.problems,
    sharedProblems.problems,
    data ?? emptyContests
  );

  const contestListError = error === undefined ? undefined : "Failed to load saved contestList.";

  return {
    error: contestListError,
    loading: isLoading,
    contests,
    isContestListLoading: isLoading,
    contestListError,
  };
}

export default useContestStore;
