import { useMemo } from "react";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import useUserStore from "../../data/hooks/useUserStore";
import { codeforcesApi } from "../../data/queries/codeforcesQuery";
import { useAppSelector } from "../../data/store";
import {
  getAttemptedUnsolvedProblems,
  getHomeStatistics,
  getWeeklySolvedProblems,
} from "./homeStatistics";
import { getProblemContestIdRange, isRatedProblem } from "../../util/submissionProblems";

function useHomePage() {
  const { theme } = useTheme();
  const { userList, addHandle, removeHandle } = useUserStore();
  const { rawSubmissions, loading, error } = useSubmissionsStore();
  const { isLoading: areProblemsLoading } = codeforcesApi.useGetProblemsQuery();
  const { isLoading: areContestsLoading } = codeforcesApi.useGetContestQuery();
  const submissionRequestId = useAppSelector((state) => state.userSubmissions.requestId);
  const statistics = useMemo(
    () => getHomeStatistics(rawSubmissions, new Date()),
    [rawSubmissions]
  );
  const statisticDetails = useMemo(() => {
    const referenceDate = new Date();
    const weeklyProblems = getWeeklySolvedProblems(rawSubmissions, referenceDate)
      .map((submission) => submission.problem);
    return {
      weeklyContestRange: getProblemContestIdRange(weeklyProblems),
      weeklyRatedContestRange: getProblemContestIdRange(weeklyProblems.filter(isRatedProblem)),
      attemptedContestRange: getProblemContestIdRange(
        getAttemptedUnsolvedProblems(rawSubmissions).map((submission) => submission.problem),
      ),
    };
  }, [rawSubmissions]);
  const handles = userList.handles;
  const hasHandles = handles.length > 0;
  const hasSubmissions = rawSubmissions.length > 0;
  const isPreparingInitialSync = hasHandles
    && !hasSubmissions
    && error === undefined
    && (areProblemsLoading || areContestsLoading || submissionRequestId === undefined);
  const isLoading = hasHandles && (loading > 0 || isPreparingInitialSync);

  return {
    theme,
    handles,
    addHandle,
    removeHandle,
    statistics,
    statisticDetails,
    hasHandles,
    hasSubmissions,
    isLoading,
    error,
  };
}

export default useHomePage;
