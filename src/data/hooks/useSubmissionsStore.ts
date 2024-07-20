import { createSelector } from "@reduxjs/toolkit";
import { useAppSelector } from "../store";
import { sortByCompare } from "../../util/sortMethods";
import lowerBound from "../../util/lowerBound";
import { ProblemShared } from "../../util/DataTypes/Problem";
import Submission from "../../util/DataTypes/Submission";
import { Compared } from "../../util/Comparator";
import { useMemo, useState } from "react";

const addSharedToSubmissions = (
  userSubmissions: Submission[],
  sharedProblems: ProblemShared[]
): Submission[] => {

  let presSubs: Set<string> = new Set<string>();
  let newSubmissions: Submission[] = new Array<Submission>();

  for (let submission of userSubmissions) {
    if (submission.contestId === undefined) continue;
    let id: string = submission.id.toString() + submission.contestId.toString();
    presSubs.add(id);
  }

  for (let submission of userSubmissions) {
    let currentShared: ProblemShared = new ProblemShared(
      submission.contestId,
      submission.problem.index
    );

    let lb: number = lowerBound(sharedProblems, currentShared);

    if (
      lb >= sharedProblems.length ||
      currentShared.compareTo(sharedProblems[lb]) !== Compared.EQUAL
    )
      continue;

    if (sharedProblems[lb].shared)
      for (let problem of sharedProblems[lb].shared) {
        if (problem.contestId === undefined) continue;
        let id: string =
          submission.id.toString() + problem.contestId.toString();

        if (presSubs.has(id)) continue;
        presSubs.add(id);
        let newS = new Submission(submission);
        newS.contestId = problem.contestId;
        newS.problem.contestId = problem.contestId;
        newS.problem.index = problem.index;
        newS.author.contestId = problem.contestId;
        newS.fromShared = true;
        newS.index = problem.index;

        if (
          newS.index !== problem.index ||
          newS.problem.index !== problem.index ||
          newS.contestId !== problem.contestId
        ) {
          console.log(newS);
        }

        newSubmissions.push(newS);
      }
  }

  userSubmissions = newSubmissions.concat(userSubmissions);

  userSubmissions.sort(sortByCompare);

  return userSubmissions;
};

function useSubmissionsStore() {
  const calculateSubmissions = createSelector(
    [
      (state: any) => state.userSubmissions.submissions,
      (state: any) => state.sharedProblems.problems
    ],
    (submissions, problems) => {
      return addSharedToSubmissions(submissions, problems)
    }
  )

  const state = useAppSelector(state => {
    return {
      userSubmissions: state.userSubmissions,
      sharedProblems: state.sharedProblems
    }
  })

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useMemo(() => {
    const calculatedSubmissions = calculateSubmissions(state)
    setSubmissions(calculatedSubmissions)
  }, [state.userSubmissions.submissions, state.sharedProblems.problems])

  return {
    error: state.userSubmissions.error,
    loading: state.userSubmissions.loading,
    submissions
  }
}

export default useSubmissionsStore;