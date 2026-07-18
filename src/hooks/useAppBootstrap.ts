import { useEffect } from "react";
import { fetchSharedProblemList } from "../data/actions/fetchActions";
import useContestStore from "../data/hooks/useContestStore";
import useProblemsStore from "../data/hooks/useProblemsStore";
import useTheme from "../data/hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../data/store";
import { ThemesType } from "../util/Theme";
import useCallbackHandler from "./useCallbackHandler";
import usePageTracking from "./usePageTracking";
import useToast from "./useToast";
import useUserStore from "../data/hooks/useUserStore";

function useAppBootstrap() {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { showErrorToast } = useToast();
  const { isProblemListLoading, problemListError } = useProblemsStore();
  const { isContestListLoading, contestListError } = useContestStore();
  const { userList, syncUserSubmissions } = useUserStore();
  const userSubmissionsError = useAppSelector((state) => state.userSubmissions.error);

  usePageTracking();
  useCallbackHandler();

  useEffect(() => {
    fetchSharedProblemList(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (!isContestListLoading && !isProblemListLoading)
      syncUserSubmissions(userList.handles.length > 2 ? true : false);
  }, [isContestListLoading, isProblemListLoading, userList.handles]);

  const showErrorMessage = (message: string | undefined) => {
    if (message === undefined || message.length === 0) return;
    console.log(message);
    showErrorToast(message);
  };

  useEffect(() => {
    showErrorMessage(userSubmissionsError);
  }, [userSubmissionsError]);

  useEffect(() => {
    showErrorMessage(problemListError);
  }, [problemListError]);

  useEffect(() => {
    showErrorMessage(contestListError);
  }, [contestListError]);

  useEffect(() => {
    if (theme.themeType === ThemesType.DARK) {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }
  }, [theme.themeType]);
}

export default useAppBootstrap;
