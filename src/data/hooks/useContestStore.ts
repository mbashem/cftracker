import { createSelector } from "@reduxjs/toolkit";
import Contest from "../../types/CF/Contest";
import Problem, { ProblemLite, ProblemShared } from "../../types/CF/Problem";
import lowerBound from "../../util/lowerBound";
import { useAppSelector } from "../store";
import { useMemo, useState } from "react";

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
    newConestList.push(contest);
    rec[contest.id] = newConestList.length - 1;
  });

  for (let problem of newProblems) {
    if (problem.contestId !== undefined && rec[problem.contestId] !== undefined)
      newConestList[rec[problem.contestId]].addProblem(problem);
  }

  return newConestList;
};

function useContestStore() {
  const calculateContests = createSelector(
    [
      (state: any) => state.problems,
      (state: any) => state.sharedProblems,
      (state: any) => state.contestList.contests
    ],
    (problems, sharedProblems, contests) => {
      return addSharedToProblems(problems, sharedProblems, contests)
    }
  )

  const state = useAppSelector(state => {
    return {
      contestList: state.contestList,
      problems: state.problemList.problems,
      sharedProblems: state.sharedProblems.problems
    }
  })

  const [contests, setContests] = useState<Contest[]>([]);
  useMemo(() => {
    const calculatedContests = calculateContests(state)
    setContests(calculatedContests)
  }, [state.contestList.contests, state.problems, state.sharedProblems])

  return {
    error: state.contestList.error,
    loading: state.contestList.loading,
    contests
  }
}

export default useContestStore