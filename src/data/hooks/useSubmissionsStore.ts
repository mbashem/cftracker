import { createSelector } from "@reduxjs/toolkit";
import { useAppSelector } from "../store";
import { sortByCompare } from "../../util/sortMethods";
import lowerBound from "../../util/lowerBound";
import Problem, { ProblemShared } from "../../types/CF/Problem";
import Submission from "../../types/CF/Submission";
import { Compared } from "../../util/Comparator";
import { useMemo, useState } from "react";

const addSharedToSubmissions = (
  userSubmissions: Submission[],
  sharedProblems: ProblemShared[]
): Submission[] => {
  let userSubmissionsIdsWithContestIds: Set<string> = new Set<string>();

  for (let submission of userSubmissions) {
    if (submission.contestId === undefined) continue;

    let id: string = submission.id.toString() + submission.contestId.toString();
    userSubmissionsIdsWithContestIds.add(id);
  }

  let deepCopiedSubmissions: Submission[] = [];
  let generatedSubmissions: Submission[] = new Array<Submission>();

  for (let submission of userSubmissions) {
    deepCopiedSubmissions.push(new Submission(submission));
    let currentShared: ProblemShared = new ProblemShared(
      submission.contestId,
      submission.index
    );

    let lb: number = lowerBound(sharedProblems, currentShared);

    if (
      lb >= sharedProblems.length ||
      currentShared.compareTo(sharedProblems[lb]) !== Compared.EQUAL
    )
      continue;

    for (let problem of sharedProblems[lb].shared ?? []) {
      if (problem.contestId === undefined) continue;
      let id: string =
        submission.id.toString() + problem.contestId.toString();

      if (userSubmissionsIdsWithContestIds.has(id)) continue;
      userSubmissionsIdsWithContestIds.add(id);
      let newS = new Submission(submission);
      newS.contestId = problem.contestId;
      newS.problem = new Problem(
        submission.contestId,
        problem.index,
        submission.problem.name,
        submission.problem.type,
        submission.problem.rating,
        submission.problem.tags,
        submission.problem.solvedCount
      );
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

      generatedSubmissions.push(newS);
    }
  }

  let newUserSubmissions = deepCopiedSubmissions.concat(generatedSubmissions);
  newUserSubmissions.sort(sortByCompare);

  return newUserSubmissions;
};

function useSubmissionsStore() {
  const calculateSubmissions = createSelector(
    [
      (state: any) => state.userSubmissions.submissions,
      (state: any) => state.sharedProblems.problems
    ],
    (submissions, problems) => {
      return addSharedToSubmissions(submissions, problems);
    }
  );

  const state = useAppSelector(state => {
    return {
      userSubmissions: state.userSubmissions,
      sharedProblems: state.sharedProblems
    };
  });

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useMemo(() => {
    const calculatedSubmissions = calculateSubmissions(state);
    setSubmissions(calculatedSubmissions);
  }, [state.userSubmissions.submissions, state.sharedProblems.problems]);

  return {
    error: state.userSubmissions.error,
    loading: state.userSubmissions.loading,
    submissions,
    rawSubmissions: state.userSubmissions.submissions
  };
}

export default useSubmissionsStore;