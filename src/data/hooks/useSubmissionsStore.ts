import { createSelector } from "@reduxjs/toolkit";
import { useAppSelector } from "../store";
import { sortByCompare } from "../../util/sortMethods";
import lowerBound from "../../util/lowerBound";
import Problem, { ProblemShared } from "../../types/CF/Problem";
import Submission, { SubmissionData } from "../../types/CF/Submission";
import { Compared } from "../../util/Comparator";
import useSharedProblemsStore from "./useSharedProblemsStore";
import { EMPTY_ARRAY } from "../../util/constants";

const addSharedToSubmissions = (
  userSubmissions: Submission[],
  sharedProblems: readonly ProblemShared[]
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

    for (let problem of sharedProblems[lb].shared ?? EMPTY_ARRAY) {
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

const calculateSubmissions = createSelector(
  [
    (submissions: Submission[]) => submissions,
    (_submissions: Submission[], problems: readonly ProblemShared[]) => problems,
  ],
  addSharedToSubmissions
);

const hydrateSubmissions = createSelector(
  [(submissions: SubmissionData[]) => submissions],
  (submissions) => submissions.map((submission) => new Submission(submission))
);

function useSubmissionsStore() {
  const { sharedProblems } = useSharedProblemsStore();
  const userSubmissions = useAppSelector((state) => state.userSubmissions);
  const rawSubmissions = hydrateSubmissions(userSubmissions.submissions);
  const submissions = calculateSubmissions(rawSubmissions, sharedProblems.problems);

  return {
    error: userSubmissions.error,
    loading: userSubmissions.loading,
    submissions,
    rawSubmissions,
  };
}

export default useSubmissionsStore;
