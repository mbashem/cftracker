import { useMemo } from "react";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import useUserStore from "../../data/hooks/useUserStore";
import { codeforcesApi } from "../../data/queries/codeforcesQuery";
import { useAppSelector } from "../../data/store";
import {
  getAttemptedUnsolvedProblems,
  getHomeStatistics,
  getSnapshotDateRange,
  getSolvedProblems,
  SnapshotPeriod,
  type SnapshotCustomRange,
} from "./homeStatistics";
import { getProblemContestIdRange, isRatedProblem } from "../../util/submissionProblems";
import usePersistentState from "../../hooks/usePersistentState";
import { StorageService } from "../../util/StorageService";

function useHomePage() {
  const { theme } = useTheme();
  const { userList, addHandle, removeHandle } = useUserStore();
  const { rawSubmissions, loading, error } = useSubmissionsStore();
  const { isLoading: areProblemsLoading } = codeforcesApi.useGetProblemsQuery();
  const { isLoading: areContestsLoading } = codeforcesApi.useGetContestQuery();
  const submissionRequestId = useAppSelector((state) => state.userSubmissions.requestId);
  const [snapshotPeriod, setSnapshotPeriod] = usePersistentState<SnapshotPeriod>(
    StorageService.Keys.Home.SnapshotPeriod,
    SnapshotPeriod.WEEK,
  );
  const [customRange, setCustomRange] = usePersistentState<SnapshotCustomRange>(
    StorageService.Keys.Home.SnapshotCustomRange,
    {},
  );
  const snapshotRange = useMemo(
    () => getSnapshotDateRange(snapshotPeriod, customRange),
    [customRange, snapshotPeriod],
  );
  const statistics = useMemo(
    () => getHomeStatistics(rawSubmissions, snapshotRange),
    [rawSubmissions, snapshotRange]
  );
  const statisticDetails = useMemo(() => {
    const solvedProblems = getSolvedProblems(rawSubmissions, snapshotRange)
      .map((submission) => submission.problem);
    return {
      solvedContestRange: getProblemContestIdRange(solvedProblems),
      ratedContestRange: getProblemContestIdRange(solvedProblems.filter(isRatedProblem)),
      attemptedContestRange: getProblemContestIdRange(
        getAttemptedUnsolvedProblems(rawSubmissions, snapshotRange).map((submission) => submission.problem),
      ),
    };
  }, [rawSubmissions, snapshotRange]);
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
    snapshotPeriod,
    snapshotRange,
    customRange,
    setSnapshotPeriod,
    setCustomRange,
    hasHandles,
    hasSubmissions,
    isLoading,
    error,
  };
}

export default useHomePage;
